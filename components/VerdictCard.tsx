"use client";

import type { Verdict, Mode } from "@/lib/verdict";

const colourStyles = {
  green: { border: "border-green-800", bg: "bg-green-950" },
  yellow: { border: "border-yellow-800", bg: "bg-yellow-950" },
  red: { border: "border-red-800", bg: "bg-red-950" },
};

export default function VerdictCard({
  verdict,
  mode,
  onModeChange,
}: {
  verdict: Verdict;
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  const s = colourStyles[verdict.riskScore.colour];

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-6`}>
      {/* Mode toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm font-medium">
          <button
            onClick={() => onModeChange("buyer")}
            className={`px-4 py-1.5 transition-colors ${mode === "buyer" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-200"}`}
          >
            Buying this car
          </button>
          <button
            onClick={() => onModeChange("owner")}
            className={`px-4 py-1.5 transition-colors ${mode === "owner" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-200"}`}
          >
            I own this car
          </button>
        </div>
      </div>

      {/* Summary */}
      <p className="text-base font-medium text-white mb-5">{verdict.overallSummary}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5 pb-5 border-b border-white/10">
        <Stat label="MOT tests" value={String(verdict.totalTests)} />
        <Stat label="Passes" value={String(verdict.passes)} valueClass="text-green-400" />
        <Stat label="Failures" value={String(verdict.failures)} valueClass={verdict.failures > 0 ? "text-red-400" : undefined} />
      </div>

      {mode === "buyer" ? (
        <BuyerSection verdict={verdict} />
      ) : (
        <OwnerSection verdict={verdict} />
      )}
    </div>
  );
}

function BuyerSection({ verdict }: { verdict: Verdict }) {
  const { riskScore: rs } = verdict;
  return (
    <div className="flex flex-col gap-5">
      {/* Risk score */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">AutoIntel Score</p>
            <div className="relative group/tooltip">
              <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-gray-600 text-gray-500 text-[9px] font-bold cursor-default select-none">i</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 shadow-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-10">
                Calculated from MOT pass rate, dangerous and major defects on the latest test, mileage relative to age, peer comparison, and any mileage or recall flags.
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
              </div>
            </div>
          </div>
          <span className={`text-sm font-semibold ${
            rs.colour === "red" ? "text-red-400" :
            rs.colour === "yellow" ? "text-yellow-400" :
            "text-green-400"
          }`}>{rs.label} · {rs.score}/100</span>
        </div>
        <div className="h-2 w-full rounded-full bg-black/30">
          <div
            className={`h-2 rounded-full ${
              rs.colour === "red" ? "bg-red-400" :
              rs.colour === "yellow" ? "bg-yellow-400" :
              "bg-green-400"
            }`}
            style={{ width: `${rs.score}%` }}
          />
        </div>
      </div>

      {!verdict.mileageFlag.suspicious && (
        <div className="flex items-start gap-2 text-sm text-green-300">
          <span className="mt-0.5 shrink-0">✓</span>
          {verdict.mileageFlag.detail}
        </div>
      )}

      {verdict.redFlags.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-2">Red flags</p>
          <ul className="flex flex-col gap-2">
            {verdict.redFlags.map((f, i) => {
              const isAdvisoryFlag = f.includes("unresolved advisor");
              if (isAdvisoryFlag && verdict.recurringAdvisories.length > 0) {
                return (
                  <li key={i}>
                    <details className="group">
                      <summary className="list-none cursor-pointer flex items-start gap-2 text-sm text-red-200">
                        <span className="mt-1 shrink-0 text-red-400">✕</span>
                        <span className="flex-1">{f}</span>
                        <span className="shrink-0 text-red-400/50 text-xs mt-1 group-open:hidden">▸</span>
                      </summary>
                      <ul className="mt-2 ml-5 flex flex-col gap-1">
                        {verdict.recurringAdvisories.map((a, j) => (
                          <li key={j} className="text-xs text-red-300/70">
                            {a.text} <span className="text-red-400/50">(seen in {a.count} MOTs)</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              }
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-red-200">
                  <span className="mt-1 shrink-0 text-red-400">✕</span>
                  {f}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {verdict.currentAdvisories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-2">Known issues on this car</p>
          <ul className="flex flex-col gap-1.5">
            {verdict.currentAdvisories.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="mt-0.5 shrink-0 text-orange-400">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">Advisories from the most recent MOT — not failures, but worth negotiating on or getting fixed</p>
        </div>
      )}
    </div>
  );
}

function OwnerSection({ verdict }: { verdict: Verdict }) {
  return (
    <div className="flex flex-col gap-5">
      {verdict.motExpiryDays !== null && (
        <div className={`flex items-center gap-3 text-sm font-medium ${
          verdict.motExpiryDays < 30 ? "text-red-400" :
          verdict.motExpiryDays < 90 ? "text-yellow-400" : "text-green-400"
        }`}>
          <span>{verdict.motExpiryDays > 0 ? `MOT due in ${verdict.motExpiryDays} days` : "MOT has expired"}</span>
        </div>
      )}

      {verdict.recurringAdvisories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400 mb-2">Unresolved advisories — still present</p>
          <ul className="flex flex-col gap-2">
            {verdict.recurringAdvisories.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="mt-0.5 shrink-0 text-yellow-400">⚠</span>
                <span>{a.text} <span className="text-gray-500">(present in {a.count} MOTs including the latest)</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {verdict.upcomingRisks.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-2">Current advisories — get these checked</p>
          <ul className="flex flex-col gap-1.5">
            {verdict.upcomingRisks.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="mt-0.5 shrink-0 text-orange-400">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">From your most recent MOT — these could become failures if left unaddressed</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueClass ?? "text-white"}`}>{value}</p>
    </div>
  );
}
