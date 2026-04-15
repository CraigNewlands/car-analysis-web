import type { VehicleReport, VehicleDetail, PriceSubmission } from "./types";

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

export async function submitPrice(data: PriceSubmission): Promise<void> {
  await fetch(`${BASE}/price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  // Fire-and-forget — don't block the UI on failure
}
