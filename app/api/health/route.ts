import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const store = await getStore();
  return NextResponse.json({
    status: "ok",
    service: "athena-api",
    version: "1.0.0",
    source: store.source,
    records: store.records.length,
    states: store.states.length,
    years: [Math.min(...store.years), Math.max(...store.years)],
    uptimeMs: Date.now() - started,
    timestamp: new Date().toISOString(),
  });
}