import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchReportMeta(vrm: string) {
  try {
    const res = await fetch(`${BASE}/report/${encodeURIComponent(vrm.toUpperCase())}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ vrm: string }> }
): Promise<Metadata> {
  const { vrm } = await params;
  const report = await fetchReportMeta(vrm);

  if (!report) {
    return {
      title: `${vrm.toUpperCase()} — AutoIntel`,
      description: "Check MOT history and predicted fault risks for any UK car.",
    };
  }

  const score = report.peer_analysis?.pass_rate ?? null;
  const description = `${report.make} ${report.model} (${report.year}) · ${report.mileage.toLocaleString()} mi · AutoIntel Score based on ${report.peer_analysis?.sample_size?.toLocaleString() ?? "real"} MOT records`;

  return {
    title: `${vrm.toUpperCase()} — ${report.make} ${report.model} — AutoIntel`,
    description,
    openGraph: {
      title: `${vrm.toUpperCase()} — ${report.make} ${report.model}`,
      description,
      url: `https://autointeluk.co.uk/check/${vrm.toUpperCase()}`,
      siteName: "AutoIntel",
    },
    twitter: {
      card: "summary",
      title: `${vrm.toUpperCase()} — ${report.make} ${report.model}`,
      description,
    },
  };
}

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
