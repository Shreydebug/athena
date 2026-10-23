"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/components/console/Filters";
import { CrimeChips, YearRange } from "@/components/console/FilterControls";
import { RankingsTable } from "@/components/console/Modules";
import CrimeHierarchy from "@/components/console/CrimeHierarchy";
import StatChronology, { type StatLens } from "@/components/console/StatChronology";
import TemporalToggle from "@/components/console/TemporalToggle";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";
import { StatCard } from "@/components/ui/StatCard";
import EChart from "@/components/charts/EChart";
import {
  heatmapCalendar,
  sankeyCrimeFlow,
  scatterOption,
  treemapStates,
} from "@/lib/chart-options";
import { fmt } from "@/lib/analytics";
import type { DashboardPayload } from "@/lib/types";

type Tab = "flow" | "treemap" | "matrix" | "scatter" | "trajectories";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "flow", label: "Crime → State flow" },
  { key: "treemap", label: "Burden treemap" },
  { key: "matrix", label: "Intensity matrix" },
  { key: "scatter", label: "Volume vs growth" },
  { key: "trajectories", label: "Trajectories (temporal)" },
];

export default function NationalPage() {
  const { crime, from, to, setRange, setCrime } = useFilters();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("flow");
  const [lens, setLens] = useState<StatLens | null>(null);
  const tap = (l: StatLens) => setLens((cur) => (cur === l ? null : l));

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    const params = new URLSearchParams({ from: String(from), to: String(to) });
    if (crime !== "all") params.set("crime", crime);
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard?${params}`, { signal: ctrl.signal });
        const d = (await res.json()) as DashboardPayload;
        if (alive) setData(d);
      } catch {
        /* aborted or failed */
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [crime, from, to]);

  const years = data?.meta.years ?? [];
  const crimeLabels = data?.meta.crimeList ?? [];

  const multiTrend = useMemo(() => {
    if (!data) return null;
    const series = data.meta.crimeList.map((c) => ({
      name: c.label,
      color: c.color,
      data: data.national.map((n) => ({ year: n.year, value: n.byCrime[c.key] ?? 0 })),
    }));
    return {
      animationDuration: 900,
      tooltip: {
        backgroundColor: "rgba(8,11,15,0.95)",
        borderColor: "rgba(0,245,212,0.35)",
        textStyle: { color: "#dbe7ee", fontFamily: "JetBrains Mono, monospace", fontSize: 12 },
        trigger: "axis",
        valueFormatter: (v: number) => fmt(Number(v)),
      },
      legend: {
        top: 0,
        type: "scroll",
        textStyle: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
      },
      grid: { left: 52, right: 18, top: 42, bottom: 30 },
      xAxis: {
        type: "category",
        data: data.national.map((n) => n.year),
        boundaryGap: false,
        axisLine: { lineStyle: { color: "rgba(0,245,212,0.2)" } },
        axisLabel: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 11, formatter: (v: number) => (v >= 100000 ? `${Math.round(v / 1000)}k` : v) },
        splitLine: { lineStyle: { color: "rgba(0,245,212,0.06)" } },
      },
      series: series.map((s) => ({
        name: s.name,
        type: "line",
        smooth: 0.35,
        symbol: "none",
        data: s.data.map((p) => [p.year, p.value]),
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.05 },
      })),
    };
  }, [data]);

  const calendar = useMemo(() => {
    if (!data) return null;
    const yLabels = (data.meta.crimeList ?? []).map((c) => c.label);
    const xLabels = (data.meta.years ?? []).filter((y) => y >= from && y <= to);
    const cells: Array<[number, number, number]> = [];
    data.national.forEach((n, xi) => {
      if (xi >= xLabels.length) return;
      data.meta.crimeList.forEach((c, yi) => {
        cells.push([xi, yi, n.byCrime[c.key] ?? 0]);
      });
    });
    return heatmapCalendar(cells, xLabels, yLabels);
  }, [data, from, to]);

  const scatter = useMemo(
    () =>
      data &&
      scatterOption(
        data.rankings.map((r) => ({
          state: r.state,
          x: r.value,
          y: r.growth ?? 0,
        })),
        "total cases",
        "window growth %",
      ),
    [data],
  );

  const treemap = useMemo(
    () =>
      data &&
      treemapStates(data.rankings.map((r) => ({ state: r.state, value: r.value }))),
    [data],
  );

  const sankey = useMemo(
    () =>
      data &&
      sankeyCrimeFlow(
        data.crimeComposition.map((c) => ({
          key: c.key,
          label: c.label,
          color: c.color,
          total: c.value,
        })),
        data.stateComposition,
        10,
      ),
    [data],
  );

  const spark = useMemo(() => data?.national.map((n) => n.total) ?? [], [data]);
  const yearSeries = useMemo(
    () => data?.national.map((n) => ({ year: n.year, value: n.total })) ?? [],
    [data],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="deep analytics · dossier 02"
        title="Anatomy of a nation"
        right={loading ? <Tag tone="muted">syncing…</Tag> : <Tag tone="accent">2001–2021 · NCRB</Tag>}
      />

      <div className="dossier-lede dossier-lede-tight">
        <p className="dossier-sub">
          One view at a time. Pick a lens below — the seven-line spaghetti chart no longer
          loads on every visit. Drill the divisions first, then open a single visual lens.
        </p>
      </div>

      <Panel title="Query Filters" className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <CrimeChips crimeList={crimeLabels} />
          </div>
          <YearRange years={years.length ? years : []} from={from} to={to} onChange={setRange} />
        </div>
      </Panel>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Cases" value={data.hero.total} tone="primary" delay={0} spark={spark} onClick={() => tap("total")} selected={lens === "total"} />
            <StatCard label="Avg / Year" value={data.hero.avgPerYear} tone="info" delay={60} spark={spark} sparkColor="#38BDF8" onClick={() => tap("avg")} selected={lens === "avg"} />
            <StatCard label="States" value={data.hero.statesIncluded} tone="accent" delay={120} onClick={() => tap("context")} selected={lens === "context"} />
            <StatCard
              label="Peak Year"
              value={data.hero.peakYear?.year ?? 0}
              tone="warning"
              delay={180}
              format={(v) => String(v)}
              sub={data.hero.peakYear ? `${fmt(data.hero.peakYear.value)} cases` : null}
              onClick={() => tap("peak")}
              selected={lens === "peak"}
            />
          </div>
          {lens && (
            <Panel title="Chronology on demand" right={<Tag tone="accent">TAP-TO-REVEAL</Tag>}>
              <StatChronology
                lens={lens}
                series={yearSeries}
                breakdown={crime === "all" ? data.national : undefined}
                crimeList={crime === "all" ? data.meta.crimeList : undefined}
                focusKey={crime === "all" ? (data.hero.dominantCrime?.key ?? "domesticViolence") : undefined}
                focusLabel={crime === "all" ? (data.hero.dominantCrime?.label ?? "Domestic Violence") : undefined}
                onClose={() => setLens(null)}
              />
            </Panel>
          )}

          <Panel
            title="Case Anatomy — divisions first"
            right={<Tag tone="warning">DRILL, NOT SCROLL</Tag>}
          >
            <CrimeHierarchy data={data} onPickCrime={(c) => setCrime(c)} />
          </Panel>

          <Panel
            title="Visual lens"
            right={
              <div className="flex flex-wrap gap-1.5">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`cs-chip ${tab === t.key ? "cs-chip-active" : ""}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            }
          >
            {tab === "flow" &&
              (sankey ? (
                <EChart option={sankey} height={460} />
              ) : (
                <p className="font-mono text-[11px] text-faint py-8 text-center">
                  sankey available for the all-crime view — restrict filters to inspect category flows
                </p>
              ))}
            {tab === "treemap" && treemap && <EChart option={treemap} height={420} />}
            {tab === "matrix" && calendar && <EChart option={calendar} height={380} />}
            {tab === "scatter" && scatter && <EChart option={scatter} height={420} />}
            {tab === "trajectories" && (
              <TemporalToggle title="Category trajectories" hint="opt-in temporal" defaultOpen>
                {multiTrend && <EChart option={multiTrend} height={360} />}
              </TemporalToggle>
            )}
            {tab !== "trajectories" && (
              <p className="font-mono text-[10px] text-faint mt-3">
                Chronology lives only under the “trajectories” lens — every other lens here is
                structural (who carries what), not year-by-year.
              </p>
            )}
          </Panel>

          <Panel title="Full Ranking">
            <RankingsTable rows={data.rankings} limit={36} />
          </Panel>
        </>
      )}
    </div>
  );
}
