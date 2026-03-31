"use client";

import { useEffect, useState } from "react";
import { fetchReport, fetchVehicle } from "@/lib/api";
import type { VehicleReport, VehicleDetail } from "@/lib/types";
import { computeVerdict } from "@/lib/verdict";
import HeroCard from "@/components/HeroCard";
import KnownIssues from "@/components/KnownIssues";
import CommonFaults from "@/components/CommonFaults";
import MotHistory from "@/components/MotHistory";

export default function CheckPage({ params }: { params: Promise<{ vrm: string }> }) {
  const [vrm, setVrm] = useState<string | null>(null);
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setVrm(p.vrm));
  }, [params]);

  useEffect(() => {
    if (!vrm) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchReport(vrm), fetchVehicle(vrm)])
      .then(([r, v]) => { setReport(r); setVehicle(v); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [vrm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-gray-400">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-400" />
        <p>Analysing vehicle history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 px-6 py-5 text-red-300">
        <p className="font-semibold">Could not find this vehicle</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!report || !vehicle) return null;

  const verdict = computeVerdict(vehicle, report);

  return (
    <div className="flex flex-col gap-6">
      <HeroCard report={report} verdict={verdict} />
      <KnownIssues verdict={verdict} />
      <CommonFaults report={report} />
      <MotHistory report={report} vehicle={vehicle} />
    </div>
  );
}
