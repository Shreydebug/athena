"use client";

import { useEffect, useState } from "react";
import { useFilters } from "@/components/console/Filters";
import { CrimeChips, YearRange } from "@/components/console/FilterControls";
import { InsightFeed } from "@/components/console/Modules";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";
import type { DashboardPayload } from "@/lib/types";

export default function InsightsPage() {
  const { crime, from, to, setRange } = useFilters();
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ from: String(from), to: String(to) });
    if (crime !== "all") q.set("crime", crime);
    fetch(`/api/dashboard?${q}`)
      .then((r) => r.json())
      .then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [crime, from, to]);

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="automated intelligence"
        title="Insights"
        right={<Tag tone="warning">RULE ENGINE v1</Tag>}
      />

      <Panel title="Query Filters" className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <CrimeChips crimeList={data?.meta.crimeList ?? []} />
          </div>
          <YearRange years={data?.meta.years ?? []} from={from} to={to} onChange={setRange} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Intelligence Feed" right={<Tag tone="accent">LIVE</Tag>}>
          <InsightFeed insights={data?.insights ?? []} />
        </Panel>
        <Panel title="Briefing Notes" right={<Tag>METHOD</Tag>}>
          <div className="space-y-4 font-mono text-[11px] text-muted leading-relaxed">
            <p>
              <span className="text-primary">01 · NATIONAL TRAJECTORY</span>
              <br />
              Compares the first and last year of the window; flags surges above +25% and
              collapses below −10%.
            </p>
            <p>
              <span className="text-primary">02 · HOTSPOT DETECTION</span>
              <br />
              Identifies the highest and lowest caseload states by share of the national load.
            </p>
            <p>
              <span className="text-primary">03 · RISER / DECLINER SCAN</span>
              <br />
              Ranks every state by growth rate; flags moves beyond ±20% as outliers.
            </p>
            <p>
              <span className="text-primary">04 · ANOMALY WINDOW</span>
              <br />
              Detects the largest single-year swing and compares it against the window average.
            </p>
            <p>
              <span className="text-primary">05 · HALF-WINDOW SHIFT</span>
              <br />
              Splits the window in two and measures caseload drift between halves.
            </p>
            <p className="text-faint">
              The engine runs server-side on aggregated statistics for every filter change.
              Future builds can swap this rule layer for LLM-generated briefs.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}