import { NextRequest } from "next/server";
import { getStore } from "@/lib/db";
import { CRIME_KEYS, crimeMeta, filterRecords } from "@/lib/analytics";
import type { CrimeKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const store = await getStore();
  const sp = req.nextUrl.searchParams;
  const crimeRaw = sp.get("crime") ?? "all";
  const crime: CrimeKey | "all" = (CRIME_KEYS as string[]).includes(crimeRaw) ? (crimeRaw as CrimeKey) : "all";
  const from = Number(sp.get("from")) || 2001;
  const to = Number(sp.get("to")) || 2021;
  const states = sp.get("states")?.split(",").filter(Boolean) ?? [];

  const recs = filterRecords(store.records, { crime, from, to, states });
  const header = ["State", "Year", ...CRIME_KEYS.map((k) => crimeMeta(k)?.label ?? k), "Total"];
  const lines = recs
    .sort((a, b) => a.state.localeCompare(b.state) || a.year - b.year)
    .map((r) => [r.state, String(r.year), ...CRIME_KEYS.map((k) => String(r[k])), String(r.total)].join(","));

  const csv = [header.join(","), ...lines].join("\n");
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crimescape-${crime}-${from}-${to}.csv"`,
    },
  });
}