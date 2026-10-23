import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { CRIME_KEYS, CRIME_META } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  return NextResponse.json({
    states: store.states,
    years: store.years,
    crimes: CRIME_META,
    crimeKeys: CRIME_KEYS,
    source: store.source,
  });
}