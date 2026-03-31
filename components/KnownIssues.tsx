import type { Verdict } from "@/lib/verdict";

export default function KnownIssues({ verdict }: { verdict: Verdict }) {
  if (verdict.currentAdvisories.length === 0) return null;

  return (
    <div className="rounded-xl border border-orange-900 bg-gray-900/50 p-6">
      <h2 className="mb-1 text-base font-semibold">Known Issues</h2>
      <p className="mb-4 text-xs text-gray-500">
        Advisories from the most recent MOT — not failures, but worth negotiating on or getting fixed before buying
      </p>
      <ul className="flex flex-col gap-2">
        {verdict.currentAdvisories.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <span className="mt-0.5 shrink-0 text-orange-400">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
