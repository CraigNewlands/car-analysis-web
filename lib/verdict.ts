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
  previousKeepers: number | null;
  taxStatus: string | null;
  taxDueDate: string | null;

  // Owner-specific
  recurringAdvisories: RecurringAdvisory[];
  upcomingRisks: string[];

  // How many items at the top of thingsToCheck/upcomingRisks are live advisories on this car
  currentAdvisoryCount: number;
}

function mileageTests(tests: MotTest[]): number[] {
  return tests
    .map((t) => Number(t.odometerValue))
    .filter((m) => !isNaN(m) && m > 0);
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

function computeRiskScore(params: {
  passRate: number;
  totalTests: number;
  mileageSuspicious: boolean;
  hasOutstandingRecall: boolean;
  dangerousDefectsOnLatest: number;
  majorDefectsOnLatest: number;
  peerPassRate: number | null;
  mileage: number;
  firstUsedDate: string;
}): RiskScore {
  const {
    passRate, totalTests, mileageSuspicious, hasOutstandingRecall,
    dangerousDefectsOnLatest, majorDefectsOnLatest, peerPassRate,
    mileage, firstUsedDate,
  } = params;

  let score = 0;

  // Pass rate (0–40 points) — most signal
  score += (1 - passRate) * 40;

  // Dangerous defects on latest MOT (0–20 points)
  score += Math.min(dangerousDefectsOnLatest * 10, 20);

  // Major defects on latest MOT (0–10 points)
  score += Math.min(majorDefectsOnLatest * 5, 10);

  // Mileage relative to age (0–15 points)
  const ageYears = (Date.now() - new Date(firstUsedDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYears > 0) {
    const annualMileage = mileage / ageYears;
    // Average UK annual mileage ~7,400 mi. High mileage = more wear.
    if (annualMileage > 15000) score += 15;
    else if (annualMileage > 10000) score += 8;
    else if (annualMileage > 7000) score += 3;
  }

  // Peer comparison (0–10 points) — worse than peers = more risk
  if (peerPassRate !== null && totalTests >= 3) {
    const peerDiff = peerPassRate / 100 - passRate;
    if (peerDiff > 0.2) score += 10;
    else if (peerDiff > 0.1) score += 5;
  }

  // Hard penalties
  if (mileageSuspicious) score += 20;
  if (hasOutstandingRecall) score += 15;

  const riskClamped = Math.min(Math.round(score), 100);
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
  if (report.previous_keepers !== null && report.previous_keepers !== undefined && report.previous_keepers >= 4) {
    redFlags.push(`${report.previous_keepers} previous keeper${report.previous_keepers !== 1 ? "s" : ""} — high turnover can indicate recurring problems`);
  }

  // Current advisories on the car right now (from the most recent MOT)
  const sortedTests = [...tests].sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  const latestTest = sortedTests[sortedTests.length - 1];
  const dangerousDefectsOnLatest = latestTest ? latestTest.defects.filter((d) => d.dangerous).length : 0;
  const majorDefectsOnLatest = latestTest ? latestTest.defects.filter((d) => !d.dangerous && d.type === "FAIL").length : 0;
  const currentAdvisories = latestTest
    ? latestTest.defects.filter((d) => d.type === "ADVISORY").map((d) => d.text)
    : [];

  // Owner: current advisories are the upcoming risks to address
  const upcomingRisks = currentAdvisories.slice(0, 7);

  const riskScore = computeRiskScore({
    passRate,
    totalTests,
    mileageSuspicious: mileageFlag.suspicious,
    hasOutstandingRecall,
    dangerousDefectsOnLatest,
    majorDefectsOnLatest,
    peerPassRate: report.peer_analysis.pass_rate,
    mileage: report.mileage,
    firstUsedDate: vehicle.firstUsedDate,
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
    previousKeepers: report.previous_keepers ?? null,
    taxStatus: report.tax_status ?? null,
    taxDueDate: report.tax_due_date ?? null,
  };
}
