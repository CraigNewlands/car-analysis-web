import type { VehicleReport, VehicleDetail } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchReport(vrm: string): Promise<VehicleReport> {
  const res = await fetch(`${BASE}/report/${encodeURIComponent(vrm.toUpperCase().replace(/\s/g, ""))}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchVehicle(vrm: string): Promise<VehicleDetail> {
  const res = await fetch(`${BASE}/vehicle/${encodeURIComponent(vrm.toUpperCase().replace(/\s/g, ""))}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}
