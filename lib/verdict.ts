import type { VehicleDetail, VehicleReport, MotTest } from "./types";

export type Mode = "buyer" | "owner";

export interface MileageFlag {
  suspicious: boolean;
  detail: string;
}

export interface V5CFlag {
  type: "recent_change" | "long_ownership" | "change_after_failure" | null;
  text: string;
  urgent: boolean;
}

export interface RecurringAdvisory {
  text: string;
  count: number;
}

export interface RiskScore {
  score: number;          // 0–100, higher = better
  label: "Poor" | "Fair" | "Good";
  colour: "green" | "yellow" | "red";
}

export interface Verdict {
  // Shared
  overallSummary: string;
  riskScore: RiskScore;
  v5cFlag: V5CFlag;

  // History stats
  totalTests: number;
  passes: number;
  failures: number;
  mileageFlag: MileageFlag;
  hasOutstandingRecall: boolean;
  motExpiryDays: number | null;

  // Buyer-specific
  redFlags: string[];
  currentAdvisories: string[];
  taxStatus: string | null;
  taxDueDate: string | null;

  // Owner-specific
  recurringAdvisories: RecurringAdvisory[];
  upcomingRisks: string[];

  // How many items at the top of thingsToCheck/upcomingRisks are live advisories on this car
  currentAdvisoryCount: number;
}


function checkMileageConsistency(tests: MotTest[]): MileageFlag {
  const sorted = [...tests]
    .filter((t) => !isNaN(Number(t.odometerValue)) && Number(t.odometerValue) > 0)
    .sort((a, b) => a.completedDate.localeCompare(b.completedDate));

  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i - 1].odometerValue);
    const curr = Number(sorted[i].odometerValue);
    if (curr < prev - 500) {
      return {
        suspicious: true,
        detail: `Mileage dropped from ${prev.toLocaleString()} to ${curr.toLocaleString()} mi between ${sorted[i-1].completedDate.slice(0,7)} and ${sorted[i].completedDate.slice(0,7)} — possible clocking`,
      };
    }
  }
  return { suspicious: false, detail: "Mileage increases consistently across all tests" };
}

function getRecurringAdvisories(tests: MotTest[]): RecurringAdvisory[] {
  // Sort newest-first so we can walk backwards from the latest MOT
  const sorted = [...tests].sort((a, b) => b.completedDate.localeCompare(a.completedDate));
  const latest = sorted[0];
  if (!latest) return [];

  // Start with advisories on the latest MOT
  const latestAdvisories = new Set(
    latest.defects.filter((d) => d.type === "ADVISORY").map((d) => d.text)
  );
  if (latestAdvisories.size === 0) return [];

  // For each advisory, count the consecutive streak going backwards from the latest MOT.
  // Stop counting as soon as a MOT doesn't have it (streak broken).
  const streaks = new Map<string, number>();
  for (const text of latestAdvisories) {
    let streak = 1; // already present in latest
    for (const t of sorted.slice(1)) {
      const hasIt = t.defects.some((d) => d.type === "ADVISORY" && d.text === text);
      if (hasIt) {
        streak++;
      } else {
        break; // consecutive streak broken — stop
      }
    }
    streaks.set(text, streak);
  }

  // Only surface advisories present in 2+ consecutive MOTs (including latest)
  return Array.from(latestAdvisories)
    .filter((text) => (streaks.get(text) ?? 0) >= 2)
    .map((text) => ({ text, count: streaks.get(text)! }))
    .sort((a, b) => b.count - a.count);
}

function recentPassRate(tests: MotTest[], n = 3): number {
  const sorted = [...tests].sort((a, b) => b.completedDate.localeCompare(a.completedDate));
  const recent = sorted.slice(0, n);
  if (recent.length === 0) return 1;
  return recent.filter((t) => t.testResult === "PASSED").length / recent.length;
}

function computeRiskScore(params: {
  tests: MotTest[];
  passRate: number;
  totalTests: number;
  mileageSuspicious: boolean;
  hasOutstandingRecall: boolean;
  dangerousDefectsOnLatest: number;
  recurringAdvisoryCount: number;
  v5cType: V5CFlag["type"];
  avgMileageForAge: number | null;
  mileage: number;
  motExpiryDays: number | null;
}): RiskScore {
  const {
    tests, passRate, totalTests, mileageSuspicious, hasOutstandingRecall,
    dangerousDefectsOnLatest, recurringAdvisoryCount, v5cType,
    avgMileageForAge, mileage, motExpiryDays,
  } = params;

  let penalty = 0;

  // 1. Recent pass rate — last 3 MOTs (0–30 points)
  //    Weighted more heavily than full history: current condition matters most
  const recentRate = recentPassRate(tests, 3);
  penalty += (1 - recentRate) * 30;

  // 2. Full history pass rate (0–15 points)
  if (totalTests >= 3) {
    penalty += (1 - passRate) * 15;
  }

  // 3. Mileage vs model peers (0–15 points)
  //    Use avg_mileage_for_age from the API if available, else skip
  if (avgMileageForAge !== null && avgMileageForAge > 0) {
    const ratio = mileage / avgMileageForAge;
    if (ratio > 1.5) penalty += 15;
    else if (ratio > 1.25) penalty += 10;
    else if (ratio > 1.1) penalty += 5;
    else if (ratio < 0.6) penalty += 3; // suspiciously low mileage
  }

  // 4. Dangerous defects on latest MOT (0–15 points)
  penalty += Math.min(dangerousDefectsOnLatest * 7, 15);

  // 5. Recurring unresolved advisories (0–10 points)
  penalty += Math.min(recurringAdvisoryCount * 3, 10);

  // 6. V5C signals (0–10 points)
  if (v5cType === "change_after_failure") penalty += 10;
  else if (v5cType === "recent_change") penalty += 5;

  // 7. MOT expiry (0–5 points)
  if (motExpiryDays !== null && motExpiryDays < 30) penalty += 5;
  else if (motExpiryDays !== null && motExpiryDays < 60) penalty += 2;

  // 8. Hard penalties — can override everything
  if (hasOutstandingRecall) penalty += 10;
  if (mileageSuspicious) penalty += 20;

  const riskClamped = Math.min(Math.round(penalty), 100);
  const clamped = 100 - riskClamped;

  return {
    score: clamped,
    label: clamped >= 70 ? "Good" : clamped >= 40 ? "Fair" : "Poor",
    colour: clamped >= 70 ? "green" : clamped >= 40 ? "yellow" : "red",
  };
}

function analyseV5C(lastV5CIssued: string | null, tests: MotTest[]): V5CFlag {
  if (!lastV5CIssued) return { type: null, text: "", urgent: false };

  const v5cDate = new Date(lastV5CIssued);
  const daysSinceV5C = Math.floor((Date.now() - v5cDate.getTime()) / (1000 * 60 * 60 * 24));

  // Check if there was a MOT failure shortly before the V5C was issued (within 60 days)
  const recentFailBeforeV5C = tests.some((t) => {
    if (t.testResult !== "FAILED") return false;
    const testDate = new Date(t.completedDate);
    const daysBefore = Math.floor((v5cDate.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysBefore >= 0 && daysBefore <= 60;
  });

  if (recentFailBeforeV5C && daysSinceV5C < 365) {
    return {
      type: "change_after_failure",
      text: `Logbook changed hands shortly after an MOT failure — the previous owner may have sold to avoid repair costs`,
      urgent: true,
    };
  }

  if (daysSinceV5C < 90) {
    return {
      type: "recent_change",
      text: `V5C issued ${daysSinceV5C} days ago — recent keeper change. Verify the seller isn't flipping the car due to hidden faults`,
      urgent: true,
    };
  }

  if (daysSinceV5C > 1095) {
    return {
      type: "long_ownership",
      text: `V5C suggests the same keeper for ${Math.floor(daysSinceV5C / 365)}+ years — sign of stable, long-term ownership`,
      urgent: false,
    };
  }

  return { type: null, text: "", urgent: false };
}

function motExpiryDays(expiry: string | null): number | null {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function computeVerdict(vehicle: VehicleDetail, report: VehicleReport): Verdict {
  const tests = vehicle.motTests;
  const totalTests = tests.length;
  const passes = tests.filter((t) => t.testResult === "PASSED").length;
  const failures = tests.filter((t) => t.testResult === "FAILED").length;
  const passRate = totalTests > 0 ? passes / totalTests : 1;

  const mileageFlag = checkMileageConsistency(tests);
  const hasOutstandingRecall = vehicle.hasOutstandingRecall === "Yes";
  const expiryDays = motExpiryDays(report.latest_mot.expiry ?? null);
  const recurringAdvisories = getRecurringAdvisories(tests);
  const v5cFlag = analyseV5C(report.last_v5c_issued ?? null, tests);

  // Red flags for buyers
  const redFlags: string[] = [];
  if (v5cFlag.urgent) redFlags.push(v5cFlag.text);
  if (mileageFlag.suspicious) redFlags.push(mileageFlag.detail);
  if (hasOutstandingRecall) redFlags.push("Outstanding safety recall — check with manufacturer before buying");
  if (failures > 2) redFlags.push(`Failed MOT ${failures} times — more than average for its age`);
  if (expiryDays !== null && expiryDays < 60) redFlags.push(`MOT expires in ${expiryDays} days — factor in renewal cost`);
  if (recurringAdvisories.length > 0) {
    redFlags.push(`${recurringAdvisories.length} unresolved advisor${recurringAdvisories.length > 1 ? "ies" : "y"} still present from previous MOTs — not been fixed`);
  }
  if (report.tax_status && report.tax_status !== "Taxed") {
    redFlags.push(`Vehicle is ${report.tax_status.toLowerCase()} — ensure tax is paid before driving`);
  }

  // Current advisories on the car right now (from the most recent MOT)
  const sortedTests = [...tests].sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  const latestTest = sortedTests[sortedTests.length - 1];
  const dangerousDefectsOnLatest = latestTest ? latestTest.defects.filter((d) => d.dangerous).length : 0;
const currentAdvisories = latestTest
    ? latestTest.defects.filter((d) => d.type === "ADVISORY").map((d) => d.text)
    : [];

  // Owner: current advisories are the upcoming risks to address
  const upcomingRisks = currentAdvisories.slice(0, 7);

  const riskScore = computeRiskScore({
    tests,
    passRate,
    totalTests,
    mileageSuspicious: mileageFlag.suspicious,
    hasOutstandingRecall,
    dangerousDefectsOnLatest,
    recurringAdvisoryCount: recurringAdvisories.length,
    v5cType: v5cFlag.type,
    avgMileageForAge: report.avg_mileage_for_age,
    mileage: report.mileage,
    motExpiryDays: expiryDays,
  });

  // Summary sentence driven by risk score
  const overallSummary = mileageFlag.suspicious
    ? "Mileage inconsistency detected — approach with caution"
    : hasOutstandingRecall
    ? "Outstanding safety recall on this vehicle"
    : riskScore.label === "Poor"
    ? `High risk — ${passes} pass${passes !== 1 ? "es" : ""} from ${totalTests} MOT${totalTests !== 1 ? "s" : ""}`
    : riskScore.label === "Fair"
    ? `Some concerns — ${passes} pass${passes !== 1 ? "es" : ""} from ${totalTests} MOT${totalTests !== 1 ? "s" : ""}`
    : `Clean history — ${passes} pass${passes !== 1 ? "es" : ""} from ${totalTests} MOT${totalTests !== 1 ? "s" : ""}`;

  return {
    overallSummary,
    riskScore,
    v5cFlag,
    totalTests,
    passes,
    failures,
    mileageFlag,
    hasOutstandingRecall,
    motExpiryDays: expiryDays,
    redFlags,
    currentAdvisories,
    recurringAdvisories,
    upcomingRisks,
    currentAdvisoryCount: currentAdvisories.length,
    taxStatus: report.tax_status ?? null,
    taxDueDate: report.tax_due_date ?? null,
  };
}
