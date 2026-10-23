"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFilters } from "@/components/console/Filters";
import { CrimeChips, YearRange } from "@/components/console/FilterControls";
import { InsightFeed } from "@/components/console/Modules";
import CrimeHierarchy from "@/components/console/CrimeHierarchy";
import StatChronology, { type StatLens } from "@/components/console/StatChronology";
import TemporalToggle from "@/components/console/TemporalToggle";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";
import { StatCard, DeltaTag } from "@/components/ui/StatCard";
import EChart from "@/components/charts/EChart";
import IndiaMap from "@/components/IndiaMap";
import { trendOption } from "@/lib/chart-options";
import { fmt } from "@/lib/analytics";
import type { DashboardPayload } from "@/lib/types";

export default function StatePage() {
  const params = useParams<{ state: string }>();
  const state = decodeURIComponent(params.state);
  const router = useRouter();
  const { crime, from, to, setRange, setCrime } = useFilters();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [atlas, setAtlas] = useState<DashboardPayload | null>(null);
  const [lens, setLens] = useState<StatLens | null>(null);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ from: String(from), to: String(to), states: state });
    if (crime !== "all") q.set("crime", crime);
    fetch(`/api/dashboard?${q}`)
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [crime, from, to, state]);

  // National atlas context (merged from the old /heatmap route).
  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ from: String(from), to: String(to) });
    if (crime !== "all") q.set("crime", crime);
    fetch(`/api/dashboard?${q}`)
      .then((r) => r.json())
      .then((d) => alive && setAtlas(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [crime, from, to]);

  const row = data?.rankings.find((r) => r.state === state);
  const stateSeries = data?.stateSeries[state] ?? [];
  const nationalSeries = data?.national.map((n) => ({ year: n.year, value: n.total })) ?? [];
  const nationalTotal = nationalSeries.reduce((a, p) => a + p.value, 0);
  const stateTotal = stateSeries.reduce((a, p) => a + p.value, 0);

  const trendOpt = useMemo(
    () =>
      data &&
      trendOption(
        stateSeries,
        [
          {
            name: "National",
            color: "#8B5CF6",
            data: nationalSeries,
          },
        ],
        state,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, state],
  );

  const first = stateSeries.find((p) => p.value > 0);
  const last = stateSeries[stateSeries.length - 1];
  const tap = (l: StatLens) => setLens((cur) => (cur === l ? null : l));

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="state dossier"
        title={state}
        right={
          <div className="flex items-center gap-2">
            {row && <Tag tone="accent">RANK #{row.rank}</Tag>}
            <Tag>{data?.meta.crimeList.find((c) => c.key === crime)?.label ?? "All Crimes"}</Tag>
          </div>
        }
      />

      <div className="dossier-lede dossier-lede-tight">
        <p className="dossier-sub">
          {state} in three cuts — division, crime, dossier. Tap any headline number for
          its chronological graph; the atlas below shows where this state sits in India.
        </p>
      </div>

      <Panel title="Query Filters" className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <CrimeChips crimeList={data?.meta.crimeList ?? []} />
          </div>
          <YearRange years={data?.meta.years ?? []} from={from} to={to} onChange={setRange} />
        </div>
      </Panel>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Cases" value={row?.value ?? 0} tone="primary" delay={0} spark={stateSeries.map((p) => p.value)} onClick={() => tap("total")} selected={lens === "total"} />
            <StatCard label="National Share" value={row?.share ?? 0} tone="info" delay={60} format={(v) => `${v}%`} onClick={() => tap("avg")} selected={lens === "avg"} />
            <StatCard
              label="Window Growth"
              value={row?.growth ?? 0}
              tone={(row?.growth ?? 0) > 0 ? "danger" : "warning"}
              delay={120}
              format={(v) => `${v > 0 ? "+" : ""}${v}%`}
              sub={first && last ? `${fmt(first.value)} (${first.year}) → ${fmt(last.value)} (${last.year})` : null}
              onClick={() => tap("peak")}
              selected={lens === "peak"}
            />
            <StatCard
              label="Share of India"
              value={nationalTotal ? Math.round((stateTotal / nationalTotal) * 1000) / 10 : 0}
              tone="accent"
              delay={180}
              format={(v) => `${v}%`}
              sub={<DeltaTag value={row?.growth ?? null} />}
              onClick={() => tap("context")}
              selected={lens === "context"}
            />
          </div>
          {lens && (
            <Panel title="Chronology on demand" right={<Tag tone="accent">TAP-TO-REVEAL</Tag>}>
              <StatChronology lens={lens} series={stateSeries} onClose={() => setLens(null)} />
            </Panel>
          )}

          <Panel title={`${state} — case anatomy`} right={<Tag tone="warning">DIVISION → CRIME</Tag>}>
            <CrimeHierarchy data={data} onPickCrime={(c) => setCrime(c)} />
          </Panel>

          <Panel
            title="Position on the Atlas"
            right={row ? <Tag tone="accent">RANK #{row.rank} OF {atlas?.rankings.length ?? "—"}</Tag> : undefined}
          >
            {atlas ? (
              <>
                <IndiaMap
                  data={atlas.map}
                  onSelect={(s) => router.push(`/state/${encodeURIComponent(s)}`)}
                />
                <p className="font-mono text-[10px] text-muted mt-2">
                  {state} highlighted by its recorded burden in {from}–{to}. Click any other
                  state to jump to its dossier.
                </p>
              </>
            ) : (
              <p className="font-mono text-[11px] text-faint py-8 text-center">loading atlas…</p>
            )}
          </Panel>

          <Panel title="Trajectory vs National" right={<Tag tone="muted">OPTIONAL</Tag>}>
            <TemporalToggle title={`${state} overlay vs India`} hint="collapsed by default">
              {trendOpt && <EChart option={trendOpt} height={330} />}
            </TemporalToggle>
          </Panel>

          <Panel title="Intelligence Brief">
            <InsightFeed
              insights={
                data.insights.length
                  ? data.insights
                  : [
                      {
                        severity: "info",
                        title: "Insufficient window",
                        text: "Narrow or no data available for this selection — widen the year range or switch crime category.",
                      },
                    ]
              }
            />
          </Panel>

          <Panel title="Annual Ledger" right={<Tag>NCRB</Tag>}>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="cs-table">
                <thead className="sticky top-0 bg-panel">
                  <tr>
                    <th>Year</th>
                    <th className="text-right">Cases</th>
                    <th className="text-right">Δ YoY</th>
                    <th className="text-right">Share of India</th>
                  </tr>
                </thead>
                <tbody>
                  {stateSeries.map((p, i) => {
                    const prev = stateSeries[i - 1];
                    const yoy = prev && prev.value > 0 ? Math.round(((p.value - prev.value) / prev.value) * 1000) / 10 : null;
                    const share = nationalTotal ? Math.round((p.value / nationalTotal) * 1000) / 10 : 0;
                    return (
                      <tr key={p.year}>
                        <td className="text-primary font-semibold">{p.year}</td>
                        <td className="text-right text-foreground font-semibold">{fmt(p.value)}</td>
                        <td className={`text-right ${yoy === null ? "text-faint" : yoy > 0 ? "text-danger" : "text-primary"}`}>
                          {yoy === null ? "—" : `${yoy > 0 ? "+" : ""}${yoy}%`}
                        </td>
                        <td className="text-right text-muted">{share}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
