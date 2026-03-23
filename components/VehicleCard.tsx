import type { VehicleReport } from "@/lib/types";

function motDaysRemaining(expiry: string | null): number | null {
  if (!expiry) return null;
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function VehicleCard({ report }: { report: VehicleReport }) {
  const { latest_mot } = report;
  const passed = latest_mot.result === "PASSED";
  const days = motDaysRemaining(latest_mot.expiry ?? null);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      {/* Registration plate */}
      <div className="mb-5 flex items-center gap-4">
        <div className="rounded-md border-2 border-yellow-400 bg-yellow-400 px-4 py-2 font-mono text-2xl font-black tracking-widest text-gray-950">
          {report.registration}
        </div>
        <div>
          <p className="text-xl font-semibold">{report.make} {report.model}</p>
          <p className="text-sm text-gray-400">{report.year} · {report.colour} · {report.fuel_type}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-5">
        <Stat label="Mileage" value={`${report.mileage.toLocaleString()} mi`} />
        <Stat
          label="Latest MOT"
          value={passed ? "PASSED" : "FAILED"}
          valueClass={passed ? "text-green-400" : "text-red-400"}
          sub={latest_mot.date.slice(0, 10)}
        />
        <Stat
          label="MOT Expiry"
          value={latest_mot.expiry ? latest_mot.expiry.slice(0, 10) : "—"}
          sub={days !== null ? (days > 0 ? `${days} days` : "EXPIRED") : undefined}
          subClass={days !== null && days < 30 ? "text-red-400" : "text-gray-500"}
        />
      </div>

      {/* Defects */}
      {latest_mot.defects.length > 0 && (
        <div className="mt-5 border-t border-gray-800 pt-5">
          <p className="mb-3 text-sm font-medium text-gray-400">Latest MOT defects</p>
          <ul className="flex flex-col gap-2">
            {latest_mot.defects.map((d, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                  d.dangerous ? "bg-red-900 text-red-300" : "bg-gray-800 text-gray-400"
                }`}>
                  {d.dangerous ? "DANGEROUS" : d.type}
                </span>
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, valueClass, sub, subClass }: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClass ?? ""}`}>{value}</p>
      {sub && <p className={`text-xs ${subClass ?? "text-gray-500"}`}>{sub}</p>}
    </div>
  );
}
