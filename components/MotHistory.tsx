"use client";

import { useRef, useState } from "react";
import type { VehicleReport, VehicleDetail, MotTest } from "@/lib/types";

const W = 600;
const H = 160;
const PAD = { top: 16, right: 16, bottom: 32, left: 52 };

interface TestPoint {
  miles: number;
  date: string;
  passed: boolean;
}

interface DateGroup {
  date: string;         // YYYY-MM
  cx: number;
  tests: TestPoint[];   // all tests on this date (could be fail + pass)
}

function MileageChart({ tests }: { tests: MotTest[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeGroup, setActiveGroup] = useState<DateGroup | null>(null);

  // Build individual points
  const allPoints: TestPoint[] = tests
    .filter((t) => t.odometerValue && !isNaN(Number(t.odometerValue)))
    .map((t) => ({ miles: Number(t.odometerValue), date: t.completedDate.slice(0, 7), passed: t.testResult === "PASSED" }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (allPoints.length < 2) return null;

  const maxM = Math.max(...allPoints.map((p) => p.miles));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const dates = allPoints.map((p) => new Date(p.date + "-01").getTime());
  const minT = dates[0];
  const maxT = dates[dates.length - 1];
  const xFromTime = (t: number) => PAD.left + ((t - minT) / (maxT - minT)) * innerW;
  const y = (m: number) => PAD.top + innerH - (m / maxM) * innerH;

  // Group by date — use the highest mileage of the group for the line
  const groupMap = new Map<string, DateGroup>();
  allPoints.forEach((p) => {
    if (!groupMap.has(p.date)) {
      groupMap.set(p.date, { date: p.date, cx: xFromTime(new Date(p.date + "-01").getTime()), tests: [] });
    }
    groupMap.get(p.date)!.tests.push(p);
  });
  const groups = Array.from(groupMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Line uses the highest mileage per date group
  const linePath = groups
    .map((g, i) => {
      const topMiles = Math.max(...g.tests.map((t) => t.miles));
      return `${i === 0 ? "M" : "L"} ${g.cx} ${y(topMiles)}`;
    })
    .join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    label: Math.round(maxM * frac) >= 1000 ? `${Math.round(maxM * frac / 1000)}k` : String(Math.round(maxM * frac)),
    yPos: PAD.top + innerH - frac * innerH,
  }));

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (W / rect.width);
    let nearest = groups[0];
    let minDist = Infinity;
    for (const g of groups) {
      const dist = Math.abs(g.cx - mouseX);
      if (dist < minDist) { minDist = dist; nearest = g; }
    }
    setActiveGroup(nearest);
  }

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs text-gray-500 uppercase tracking-wide">Mileage over time</p>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ height: H }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setActiveGroup(null)}
        >
          {/* Grid + Y labels */}
          {yTicks.map((t) => (
            <g key={t.label}>
              <line x1={PAD.left} x2={W - PAD.right} y1={t.yPos} y2={t.yPos} stroke="#1f2937" strokeWidth={1} />
              <text x={PAD.left - 6} y={t.yPos + 4} textAnchor="end" fontSize={10} fill="#6b7280">{t.label}</text>
            </g>
          ))}

          {/* Hover rule */}
          {activeGroup && (
            <line
              x1={activeGroup.cx} x2={activeGroup.cx}
              y1={PAD.top} y2={H - PAD.bottom}
              stroke="#facc15" strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
            />
          )}

          {/* Line */}
          <path d={linePath} fill="none" stroke="#facc15" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots — stacked vertically if multiple tests on same date */}
          {groups.map((g) => {
            const isActive = activeGroup?.date === g.date;
            // Sort so fail renders below pass
            const sorted = [...g.tests].sort((a, b) => Number(a.passed) - Number(b.passed));
            return sorted.map((t, ti) => (
              <circle
                key={`${g.date}-${ti}`}
                cx={g.cx}
                cy={y(t.miles)}
                r={isActive ? 7 : 5}
                fill={t.passed ? "#4ade80" : "#f87171"}
                stroke="#111827"
                strokeWidth={2}
              />
            ));
          })}

          {/* X-axis year labels */}
          {Array.from(new Set(groups.map((g) => g.date.slice(0, 4)))).map((year) => {
            const t = new Date(`${year}-06-01`).getTime();
            if (t < minT || t > maxT) return null;
            return (
              <text key={year} x={xFromTime(t)} y={H - 4} textAnchor="middle" fontSize={9} fill="#6b7280">{year}</text>
            );
          })}
        </svg>

        {/* Floating tooltip */}
        {activeGroup && (() => {
          const leftPct = (activeGroup.cx / W) * 100;
          const alignRight = leftPct > 65;
          return (
            <div
              className="pointer-events-none absolute top-2 z-10 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm shadow-lg min-w-[140px]"
              style={{
                [alignRight ? "right" : "left"]: `${alignRight ? 100 - leftPct : leftPct}%`,
                transform: alignRight ? "translateX(50%)" : "translateX(-50%)",
              }}
            >
              <p className="mb-1.5 text-xs text-gray-500">{activeGroup.date}</p>
              {activeGroup.tests.map((t, i) => (
                <div key={i} className={`flex items-center justify-between gap-4 ${i > 0 ? "mt-1 border-t border-gray-800 pt-1" : ""}`}>
                  <span className={`font-medium ${t.passed ? "text-green-400" : "text-red-400"}`}>
                    {t.passed ? "Passed" : "Failed"}
                  </span>
                  <span className="text-gray-300">{t.miles.toLocaleString()} mi</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function MotTestRow({ t }: { t: MotTest }) {
  const [open, setOpen] = useState(false);
  const hasDefects = t.defects.length > 0;

  return (
    <div className="rounded-lg bg-gray-900 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-800 transition-colors"
        onClick={() => hasDefects && setOpen((o) => !o)}
        disabled={!hasDefects}
      >
        <div className="flex items-center gap-3">
          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
            t.testResult === "PASSED" ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"
          }`}>
            {t.testResult}
          </span>
          <div>
            <p className="text-sm">{t.completedDate.slice(0, 10)}</p>
            {hasDefects && (
              <p className="text-xs text-gray-500">{t.defects.length} defect{t.defects.length !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {t.odometerValue && !isNaN(Number(t.odometerValue))
              ? `${Number(t.odometerValue).toLocaleString()} ${t.odometerUnit}`
              : "—"}
          </span>
          {hasDefects && (
            <svg
              className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {open && (
        <ul className="border-t border-gray-800 px-4 py-3 flex flex-col gap-2">
          {t.defects.map((d, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                d.dangerous ? "bg-red-900 text-red-300" : d.type === "FAIL" ? "bg-orange-900 text-orange-300" : "bg-gray-800 text-gray-400"
              }`}>
                {d.dangerous ? "DANGEROUS" : d.type}
              </span>
              <span className="text-gray-300">{d.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MotHistory({ vehicle }: { report: VehicleReport; vehicle: VehicleDetail }) {
  const tests = vehicle.motTests;
  return (
    <Section title="MOT History">
      <MileageChart tests={tests} />
      <div className="flex flex-col gap-2">
        {tests.map((t) => <MotTestRow key={t.motTestNumber} t={t} />)}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}
