import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { CRIME_META } from "@/lib/analytics";

export const dynamic = "force-dynamic";

interface Hit {
  type: "state" | "crime" | "year" | "nav" | "insight";
  label: string;
  sub?: string;
  href: string;
}

export async function GET(req: NextRequest) {
  const store = await getStore();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q) return NextResponse.json({ query: "", hits: [] });

  const hits: Hit[] = [];

  for (const s of store.states) {
    if (s.toLowerCase().includes(q)) {
      hits.push({ type: "state", label: s, sub: "State analytics", href: `/state/${encodeURIComponent(s)}` });
    }
  }
  for (const c of CRIME_META) {
    if (c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)) {
      hits.push({ type: "crime", label: c.label, sub: "Crime category", href: `/overview?crime=${c.key}` });
    }
  }
  for (const y of store.years) {
    if (String(y).includes(q)) {
      hits.push({ type: "year", label: String(y), sub: "Year snapshot", href: `/overview?from=${y}&to=${y}` });
    }
  }

  const nav: Array<[string, string, string]> = [
    ["Overview", "National command view", "/overview"],
    ["National Analytics", "Trends & composition", "/national"],
    ["State Analytics", "Atlas + dossiers", "/state"],
    ["Compare", "State vs state, year vs year", "/compare"],
    ["Insights", "Intelligence summaries", "/insights"],
    ["Forecast", "Projected trajectories", "/forecast"],
    ["Reports", "Export & print", "/reports"],
    ["Settings", "Console preferences", "/settings"],
  ];
  for (const [label, sub, href] of nav) {
    if (label.toLowerCase().includes(q) || sub.toLowerCase().includes(q)) {
      hits.push({ type: "nav", label, sub, href });
    }
  }

  if (q.includes("top") || q.includes("highest") || q.includes("increase") || q.includes("worst")) {
    hits.push({
      type: "insight",
      label: "Top states by cases",
      sub: "Ranked intelligence brief",
      href: "/overview",
    });
    hits.push({
      type: "insight",
      label: "Highest growth states",
      sub: "YoY growth leaders",
      href: "/insights",
    });
  }
  if (q.includes("domestic") || q.includes("dowry")) {
    hits.push({ type: "insight", label: "Domestic violence", sub: "Filter dashboard", href: "/overview?crime=domesticViolence" });
  }

  return NextResponse.json({ query: q, hits: hits.slice(0, 12) });
}