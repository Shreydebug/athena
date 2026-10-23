import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import {
  buildRankings,
  crimeMeta,
  dominantCrime,
  filterRecords,
  generateInsights,
  growthPct,
  nationalSeries,
  peakYear,
  sum,
  CRIME_KEYS,
} from "@/lib/analytics";
import type { CrimeKey, DashboardPayload, Filters } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseFilters(req: NextRequest): Filters {
  const sp = req.nextUrl.searchParams;
  const storeYears = [2001, 2021];
  const crimeRaw = sp.get("crime") ?? "all";
  const crime = (CRIME_KEYS as string[]).includes(crimeRaw) ? (crimeRaw as CrimeKey) : "all";
  const from = Math.max(Number(sp.get("from")) || storeYears[0], storeYears[0]);
  const to = Math.min(Number(sp.get("to")) || storeYears[1], storeYears[1]);
  const states = sp.get("states")?.split(",").filter(Boolean) || [];
  return { crime, from: Math.min(from, to), to: Math.max(from, to), states };
}

export async function GET(req: NextRequest) {
  const store = await getStore();
  const filters = parseFilters(req);
  const recs = filterRecords(store.records, filters);
  const yearsInWindow = store.years.filter((y) => y >= filters.from && y <= filters.to);

  const national = nationalSeries(store.records, filters.crime, yearsInWindow);
  const crimeLabel = filters.crime === "all" ? "total" : (crimeMeta(filters.crime)?.label ?? filters.crime);

  const rankings = buildRankings(recs, filters.crime, store.states);

  const firstYear = national[0]?.total ?? 0;
  const lastYear = national[national.length - 1]?.total ?? 0;
  const avgPerYear = national.length ? Math.round(sum(recs, filters.crime) / national.length) : 0;

  const map = rankings.map((r) => ({
    state: r.state,
    value: r.value,
    rank: r.rank,
    share: r.share,
    growth: r.growth,
  }));

  const composition = CRIME_KEYS.map((k) => ({
    key: k,
    label: crimeMeta(k)?.label ?? k,
    color: crimeMeta(k)?.color ?? "#888",
    value: recs.reduce((a, r) => a + r[k], 0),
    share: 0,
  }));
  const compTotal = composition.reduce((a, c) => a + c.value, 0);
  for (const c of composition) c.share = compTotal ? Math.round((c.value / compTotal) * 1000) / 10 : 0;

  const stateSeries: Record<string, Array<{ year: number; value: number }>> = {};
  for (const s of store.states) {
    stateSeries[s] = yearsInWindow.map((y) => {
      const r = recs.find((x) => x.state === s && x.year === y);
      return { year: y, value: r ? (filters.crime === "all" ? r.total : r[filters.crime]) : 0 };
    });
  }

  const stateComposition = rankings
    .slice(0, 12)
    .map((r) => {
      const recsFor = recs.filter((x) => x.state === r.state);
      const byCrime: Partial<Record<CrimeKey, number>> = {};
      for (const k of CRIME_KEYS) byCrime[k] = recsFor.reduce((a, x) => a + x[k], 0);
      return { state: r.state, byCrime };
    });

  const payload: DashboardPayload = {
    meta: {
      years: store.years,
      states: store.states,
      crimeList: store.crimeList,
      source: store.source,
    },
    filters,
    hero: {
      total: sum(recs, filters.crime),
      avgPerYear,
      yoy: growthPct(firstYear, lastYear),
      statesIncluded: rankings.length,
      dominantCrime: filters.crime === "all" ? dominantCrime(recs) : null,
      peakYear: peakYear(national.map((n) => ({ year: n.year, value: n.total }))),
    },
    national,
    map,
    rankings,
    insights: generateInsights(
      rankings,
      national.map((n) => ({ year: n.year, total: n.total })),
      store.states,
      filters.crime,
      crimeLabel,
    ),
    crimeComposition: composition,
    stateSeries,
    stateComposition,
  };

  return NextResponse.json(payload);
}