import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { linearForecast, filterRecords, valueOf, CRIME_KEYS, crimeMeta } from "@/lib/analytics";
import type { CrimeKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const store = await getStore();
  const sp = req.nextUrl.searchParams;
  const crimeRaw = sp.get("crime") ?? "all";
  const crime: CrimeKey | "all" = (CRIME_KEYS as string[]).includes(crimeRaw) ? (crimeRaw as CrimeKey) : "all";
  const state = sp.get("state") ?? "";
  const horizon = Math.min(Number(sp.get("horizon")) || 3, 6);

  const recs = filterRecords(store.records, {
    crime,
    from: 2001,
    to: 2021,
    states: state ? [state] : [],
  });
  const series = store.years.map((y) => {
    const r = recs.find((x) => x.year === y);
    return { year: y, value: r ? valueOf(r, crime) : 0 };
  });
  const forecast = linearForecast(series, horizon);

  return NextResponse.json({
    state: state || "India",
    crime: crime === "all" ? "total" : crimeMeta(crime)?.label,
    series,
    forecast,
    source: store.source,
  });
}