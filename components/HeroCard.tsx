"use client";

import { useEffect, useState } from "react";
import type { VehicleReport } from "@/lib/types";
import type { Verdict } from "@/lib/verdict";
import { isCarSaved, saveCar, removeCar } from "@/lib/savedCars";

function motExpiryText(expiry: string | null): { text: string; urgent: boolean } | null {
  if (!expiry) return null;
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return { text: "MOT has expired", urgent: true };
  if (days <= 90) return { text: `MOT expires in ${days} days`, urgent: days <= 30 };
  return { text: `MOT valid until ${expiry.slice(0, 10)}`, urgent: false };
}

export default function HeroCard({
  report,
  verdict,
}: {
  report: VehicleReport;
  verdict: Verdict;
}) {
  const { riskScore: rs } = verdict;
  const motExpiry = motExpiryText(report.latest_mot.expiry ?? null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(isCarSaved(report.registration)); }, [report.registration]);

  function toggleSave() {
    if (saved) {
      removeCar(report.registration);
      setSaved(false);
    } else {
      saveCar({
        registration: report.registration,
        make: report.make,
        model: report.model,
        year: report.year,
        savedAt: new Date().toISOString(),
        score: rs.score,
        scoreLabel: rs.label,
        scoreColour: rs.colour,
      });
      setSaved(true);
    }
  }

  const scoreColour =
    rs.colour === "red" ? "text-red-400" :
    rs.colour === "yellow" ? "text-yellow-400" :
    "text-green-400";

  const barColour =
    rs.colour === "red" ? "bg-red-400" :
    rs.colour === "yellow" ? "bg-yellow-400" :
    "bg-green-400";

  const borderColour =
    rs.colour === "red" ? "border-red-900" :
    rs.colour === "yellow" ? "border-yellow-900" :
    "border-green-900";

  // Combine red flags + positive signals into a single list
  const signals: { type: "good" | "bad"; text: string }[] = [];
  if (!verdict.mileageFlag.suspicious) {
    signals.push({ type: "good", text: verdict.mileageFlag.detail });
  }
  if (verdict.v5cFlag.type === "long_ownership") {
    signals.push({ type: "good", text: verdict.v5cFlag.text });
  }
  for (const f of verdict.redFlags) {
    signals.push({ type: "bad", text: f });
  }

  return (
    <div className={`rounded-xl border ${borderColour} bg-gray-900 overflow-hidden`}>
      {/* Identity row */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-5">
        <div className="rounded-md border-2 border-yellow-400 bg-yellow-400 px-3 py-1.5 font-mono text-xl font-black tracking-widest text-gray-950 shrink-0">
          {report.registration}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold truncate">{report.make} {report.model}</p>
          <p className="text-sm text-gray-400">{report.year} · {report.colour} · {report.fuel_type} · {report.mileage.toLocaleString()} mi</p>
          {motExpiry && (
            <p className={`text-xs mt-0.5 ${motExpiry.urgent ? "text-red-400" : "text-gray-500"}`}>{motExpiry.text}</p>
          )}
          {verdict.taxStatus && (
            <p className={`text-xs mt-0.5 ${verdict.taxStatus === "Taxed" ? "text-gray-500" : "text-red-400"}`}>
              {verdict.taxStatus === "Taxed"
                ? `Taxed until ${verdict.taxDueDate?.slice(0, 10) ?? "unknown"}`
                : verdict.taxStatus}
            </p>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="px-6 pb-5 border-t border-gray-800 pt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">AutoIntel Score</p>
          <span className={`text-sm font-bold ${scoreColour}`}>{rs.label} · {rs.score}/100</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-800">
          <div className={`h-2.5 rounded-full ${barColour} transition-all`} style={{ width: `${rs.score}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-300">{verdict.overallSummary}</p>
        <button
          onClick={toggleSave}
          className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
            saved
              ? "border-yellow-600 bg-yellow-950 text-yellow-400 hover:bg-yellow-900"
              : "border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-600"
          }`}
        >
          {saved ? "✓ Saved to garage" : "Save to garage"}
        </button>
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div className="px-6 pb-6 border-t border-gray-800 pt-4 flex flex-col gap-2">
          {signals.map((s, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm ${s.type === "good" ? "text-green-400" : "text-red-300"}`}>
              <span className="mt-0.5 shrink-0">{s.type === "good" ? "✓" : "✕"}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
