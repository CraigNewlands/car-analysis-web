import type { FailureInsight, VehicleReport } from "@/lib/types";

function FaultRow({ f }: { f: FailureInsight }) {
  const label = f.plain_english ?? f.component;

  return (
    <details className="group">
      <summary className="list-none cursor-pointer">
        <div className="flex items-center justify-between gap-3 text-sm mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {f.severity && (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                f.severity === "Dangerous" ? "bg-red-900 text-red-300" :
                f.severity === "Major"     ? "bg-orange-900 text-orange-300" :
                                             "bg-gray-800 text-gray-400"
              }`}>
                {f.severity}
              </span>
            )}
            <span className="text-gray-200 truncate">{label}</span>
            {f.what_it_means && (
              <span className="shrink-0 text-gray-600 text-xs group-open:hidden">▸</span>
            )}
          </div>
          <span className="shrink-0 text-gray-400 font-medium">{f.percentage}%</span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-gray-800 mb-1">
          <div
            className={`h-1.5 rounded-full ${
              f.severity === "Dangerous" ? "bg-red-400" :
              f.severity === "Major"     ? "bg-orange-400" :
                                           "bg-yellow-400"
            }`}
            style={{ width: `${f.percentage}%` }}
          />
        </div>
      </summary>

      {/* Expanded content — only shown when <details> is open */}
      {f.what_it_means && (
        <div className="mt-2 mb-1 ml-1 pl-3 border-l border-gray-700 text-xs text-gray-400">
          <p>{f.what_it_means}</p>
        </div>
      )}
    </details>
  );
}

export default function CommonFaults({ report }: { report: VehicleReport }) {
  const { peer_analysis: pa } = report;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <h2 className="mb-1 text-base font-semibold">Predicted Fault Risks — {report.make} {report.model}</h2>
      <p className="mb-5 text-xs text-gray-500">
        What typically fails on {report.make} {report.model}s at this mileage — based on {pa.sample_size.toLocaleString()} real MOT records
        {pa.pass_rate !== null && ` · ${pa.pass_rate}% pass rate`}
      </p>

      {pa.sample_size === 0 ? (
        <p className="text-sm text-gray-500">No data available for this make/model at this mileage.</p>
      ) : pa.common_failures.length === 0 ? (
        <p className="text-sm text-gray-500">No failure data available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pa.common_failures.map((f, i) => (
            <FaultRow key={i} f={f} />
          ))}
        </div>
      )}

      {pa.common_failures.some(f => f.what_it_means) && (
        <p className="mt-4 text-xs text-gray-600">Tap any fault to learn more.</p>
      )}
    </div>
  );
}
