import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import {
  CRIME_KEYS,
  crimeMeta,
  filterRecords,
  growthPct,
  valueOf,
} from "@/lib/analytics";
import type { ComparePayload, CrimeKey } from "@/lib/types";

const STATE_PALETTE = ["#00F5D4", "#8B5CF6", "#FFD166", "#FF4D6D", "#38BDF8", "#F472B6", "#64FFDA"];

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const store = await getStore();
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") ?? "states";

  if (mode === "crime") {
    const crimeA = (CRIME_KEYS as string[]).includes(sp.get("crimeA") ?? "")
      ? (sp.get("crimeA") as CrimeKey)
      : ("rape" as CrimeKey);
    const crimeB = (CRIME_KEYS as string[]).includes(sp.get("crimeB") ?? "")
      ? (sp.get("crimeB") as CrimeKey)
      : ("domesticViolence" as CrimeKey);
    const yearsRaw = sp.get("years")?.split(",").map(Number).filter(Number.isFinite) ?? [];
    const years = yearsRaw.length ? yearsRaw : store.years;
    const from = Math.min(...years);
    const to = Math.max(...years);

    const rowFor = (key: CrimeKey, color: string): ComparePayload["rows"][number] => {
      const recs = filterRecords(store.records, { crime: key, from, to });
      const byYear = new Map<number, number>();
      for (const r of recs) byYear.set(r.year, (byYear.get(r.year) ?? 0) + valueOf(r, key));
      const series = [...years]
        .sort((a, b) => a - b)
        .map((y) => ({ year: y, value: byYear.get(y) ?? 0 }));
      const present = series.filter((p) => p.value > 0);
      const first = present[0] ?? null;
      const last = present[present.length - 1] ?? null;
      const composition = CRIME_KEYS.map((k) => ({
        key: k,
        label: crimeMeta(k)?.label ?? k,
        color: crimeMeta(k)?.color ?? "#888",
        value: 0,
        share: 0,
      }));
      return {
        state: crimeMeta(key)?.label ?? key,
        color,
        total: present.reduce((a, p) => a + p.value, 0),
        avg: present.length ? Math.round(present.reduce((a, p) => a + p.value, 0) / present.length) : 0,
        first: first?.value ?? null,
        last: last?.value ?? null,
        growth: first && last ? growthPct(first.value, last.value) : null,
        peakYear: series.length ? series.reduce((a, b) => (b.value > a.value ? b : a), series[0]).year : null,
        peakValue: series.length ? series.reduce((a, b) => (b.value > a.value ? b : a), series[0]).value : null,
        series,
        composition,
      };
    };

    const rows = [
      rowFor(crimeA, crimeMeta(crimeA)?.color ?? "#00F5D4"),
      rowFor(crimeB, crimeMeta(crimeB)?.color ?? "#8B5CF6"),
    ];

    const insights: ComparePayload["insights"] = [];
    const [a, b] = rows;
    const aTotal = a.total;
    const bTotal = b.total;
    if (aTotal || bTotal) {
      insights.push({
        severity: "info",
        title: "Category head-to-head",
        text: `${a.state} outnumbers ${b.state} ${Math.round((aTotal / Math.max(bTotal, 1)) * 100) / 100}× in the ${from}–${to} window (${aTotal.toLocaleString("en-IN")} vs ${bTotal.toLocaleString("en-IN")}).`,
      });
    }
    if (a.growth !== null && b.growth !== null) {
      insights.push({
        severity: a.growth > b.growth ? "warning" : "positive",
        title: "Growth divergence",
        text: `${a.state} ${a.growth > 0 ? "+" : ""}${a.growth}% vs ${b.state} ${b.growth > 0 ? "+" : ""}${b.growth}% across ${years.length} years — ${a.growth > b.growth ? a.state : b.state} is outpacing the other.`,
      });
    }
    if (a.peakYear !== b.peakYear) {
      insights.push({
        severity: "info",
        title: "Asymmetric peaks",
        text: `${a.state} peaks in ${a.peakYear} while ${b.state} peaks in ${b.peakYear} — suggesting different drivers.`,
      });
    }

    const payload: ComparePayload = {
      states: rows.map((r) => r.state),
      years: [...years].sort((a, b) => a - b),
      crime: "all",
      rows,
      insights,
    };
    return NextResponse.json(payload);
  }

  const crimeRaw = sp.get("crime") ?? "all";
  const crime: CrimeKey | "all" = (CRIME_KEYS as string[]).includes(crimeRaw)
    ? (crimeRaw as CrimeKey)
    : "all";
  const states = sp.get("states")?.split(",").filter(Boolean) ?? [];
  const yearsRaw = sp.get("years")?.split(",").map(Number).filter(Number.isFinite) ?? [];
  const years = yearsRaw.length ? yearsRaw : store.years;

  const recs = filterRecords(store.records, { crime, from: Math.min(...years), to: Math.max(...years) });

  const rows = states.map((state, i) => {
    const s = recs.filter((r) => r.state === state);
    const series = years
      .sort((a, b) => a - b)
      .map((y) => {
        const r = s.find((x) => x.year === y);
        return { year: y, value: r ? valueOf(r, crime) : 0 };
      });
    const present = series.filter((p) => p.value > 0);
    const first = present[0] ?? null;
    const last = present[present.length - 1] ?? null;
    const composition = CRIME_KEYS.map((k) => ({
      key: k,
      label: crimeMeta(k)?.label ?? k,
      color: crimeMeta(k)?.color ?? "#888",
      value: s.reduce((a, r) => a + r[k], 0),
      share: 0,
    }));
    const cTotal = composition.reduce((a, c) => a + c.value, 0);
    for (const c of composition) c.share = cTotal ? Math.round((c.value / cTotal) * 1000) / 10 : 0;
    return {
      state,
      color: STATE_PALETTE[i % STATE_PALETTE.length],
      total: s.reduce((a, r) => a + valueOf(r, crime), 0),
      avg: present.length ? Math.round(present.reduce((a, p) => a + p.value, 0) / present.length) : 0,
      first: first?.value ?? null,
      last: last?.value ?? null,
      growth: first && last ? growthPct(first.value, last.value) : null,
      peakYear: series.length ? series.reduce((a, b) => (b.value > a.value ? b : a), series[0]).year : null,
      peakValue: series.length ? series.reduce((a, b) => (b.value > a.value ? b : a), series[0]).value : null,
      series,
      composition,
    };
  });

  const insights: ComparePayload["insights"] = [];
  if (rows.length >= 2) {
    const sorted = [...rows].sort((a, b) => b.total - a.total);
    const leader = sorted[0];
    const runner = sorted[1];
    insights.push({
      severity: "info",
      title: "Head-to-head",
      text: `${leader.state} outpaces ${runner.state} by ${Math.round(((leader.total - runner.total) / Math.max(runner.total, 1)) * 1000) / 10}% in ${crime === "all" ? "total cases" : crimeMeta(crime)?.label} (${leader.total.toLocaleString("en-IN")} vs ${runner.total.toLocaleString("en-IN")}).`,
    });
    const riser = [...rows].filter((r) => r.growth !== null).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))[0];
    if (riser && (riser.growth ?? 0) > 10) {
      insights.push({
        severity: "warning",
        title: "Growth divergence",
        text: `${riser.state} is growing fastest at +${riser.growth}% while the comparison set averages ${Math.round(rows.reduce((a, r) => a + (r.growth ?? 0), 0) / rows.length * 10) / 10}%.`,
      });
    }
  }
  if (rows.length === 2) {
    const a = rows[0];
    const b = rows[1];
    if (a.growth !== null && b.growth !== null) {
      insights.push({
        severity: a.growth > b.growth ? "warning" : "positive",
        title: "Trajectory verdict",
        text: `${a.state} (${a.growth > 0 ? "+" : ""}${a.growth}%) vs ${b.state} (${b.growth > 0 ? "+" : ""}${b.growth}%) across ${years.length} years.`,
      });
    }
  }

  const payload: ComparePayload = {
    states,
    years: [...years].sort((a, b) => a - b),
    crime,
    rows,
    insights,
  };
  return NextResponse.json(payload);
}