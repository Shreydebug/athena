"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/components/console/Filters";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";
import { StatCard } from "@/components/ui/StatCard";
import EChart from "@/components/charts/EChart";
import { fmt } from "@/lib/analytics";

interface Fc {
  state: string;
  crime: string;
  series: Array<{ year: number; value: number }>;
  forecast: Array<{ year: number; value: number; forecast: boolean }>;
}

export default function ForecastPage() {
  const { crime, setCrime } = useFilters();
  const [allStates, setAllStates] = useState<string[]>([]);
  const [state, setState] = useState("");
  const [data, setData] = useState<Fc | null>(null);
  const [horizon, setHorizon] = useState(3);

  useEffect(() => {
    fetch("/api/meta").then((r) => r.json()).then((d) => setAllStates(d.states ?? []));
  }, []);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ horizon: String(horizon) });
    if (crime !== "all") q.set("crime", crime);
    if (state) q.set("state", state);
    fetch(`/api/forecast?${q}`)
      .then((r) => r.json())
      .then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [crime, state, horizon]);

  const opt = useMemo(() => {
    if (!data) return null;
    const past = data.series.map((p) => ({ year: p.year, value: p.value }));
    const fc = data.forecast;
    const all = [...past.map((p) => p.year), ...fc.map((p) => p.year)];
    const series: Array<Record<string, unknown>> = [
      {
        name: "observed",
        type: "line",
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 4,
        showSymbol: false,
        data: past.map((p) => [p.year, p.value]),
        lineStyle: { width: 2.5, color: "#00F5D4", shadowColor: "rgba(0,245,212,0.4)", shadowBlur: 10 },
        itemStyle: { color: "#00F5D4" },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(0,245,212,0.25)" },
              { offset: 1, color: "rgba(0,245,212,0.01)" },
            ],
          },
        },
      },
      {
        name: "projection",
        type: "line",
        smooth: 0.3,
        symbol: "diamond",
        symbolSize: 7,
        data: fc.map((p) => [p.year, p.value]),
        lineStyle: { width: 2, color: "#FFD166", type: "dashed", shadowColor: "rgba(255,209,102,0.35)", shadowBlur: 8 },
        itemStyle: { color: "#FFD166" },
      },
    ];
    return {
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        backgroundColor: "rgba(8,11,15,0.95)",
        borderColor: "rgba(0,245,212,0.35)",
        textStyle: { color: "#dbe7ee", fontFamily: "JetBrains Mono, monospace", fontSize: 12 },
        trigger: "axis",
        valueFormatter: (v: unknown) => fmt(Number(v)),
      },
      grid: { left: 52, right: 18, top: 24, bottom: 30 },
      xAxis: {
        type: "category",
        data: all,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "rgba(0,245,212,0.2)" } },
        axisLabel: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 11, formatter: (v: number) => (v >= 100000 ? `${Math.round(v / 1000)}k` : v) },
        splitLine: { lineStyle: { color: "rgba(0,245,212,0.06)" } },
      },
      series,
    } as const;
  }, [data]);

  const projected = data?.forecast[data.forecast.length - 1];

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="predictive layer"
        title="Forecast"
        right={<Tag tone="accent">LINEAR MODEL</Tag>}
      />

      <Panel title="Configuration" className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5 flex-wrap">
          <div className="flex-1 min-w-52">
            <div className="flex flex-wrap gap-2">
              {["all", "rape", "kidnapAssault", "dowryDeaths", "assaultWomen", "assaultModesty", "domesticViolence", "trafficking"].map((c) => (
                <button key={c} className={`cs-chip ${crime === c ? "cs-chip-active" : ""}`} onClick={() => setCrime(c as never)}>
                  {c === "all" ? "All Crimes" : c}
                </button>
              ))}
            </div>
          </div>
          <label className="font-mono text-xs text-muted flex items-center gap-2">
            TARGET
            <select className="cs-select" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">India (national)</option>
              {allStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="font-mono text-xs text-muted flex items-center gap-2">
            HORIZON
            <select className="cs-select" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} year{h > 1 ? "s" : ""}</option>)}
            </select>
          </label>
        </div>
      </Panel>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Projected Total" value={projected?.value ?? 0} tone="warning" delay={0} sub={projected ? `${projected.year} (${data.crime})` : null} />
            <StatCard
              label="Trajectory"
              value={data.series.length > 1 && data.series[data.series.length - 1].value ? Math.round(((projected?.value ?? 0) / data.series[data.series.length - 1].value - 1) * 1000) / 10 : 0}
              tone={(projected?.value ?? 0) > data.series[data.series.length - 1].value ? "danger" : "primary"}
              delay={60}
              format={(v) => `${v > 0 ? "+" : ""}${v}%`}
            />
            <StatCard label="Series Years" value={data.series.length} tone="accent" delay={120} />
          </div>

          <Panel title="Observed vs Projected" right={<Tag tone="warning">DASHED = PROJECTION</Tag>}>
            {opt && <EChart option={opt} height={380} />}
          </Panel>

          <Panel title="Model Notes" right={<Tag tone="muted">METHODOLOGY</Tag>}>
            <p className="font-mono text-[11px] text-muted leading-relaxed">
              Projections use ordinary least-squares regression over observed annual totals
              (2001–2021). Values are floor-clamped at zero. This is a trend projection for
              exploratory analysis — it does not account for reporting changes, legal reform,
              or enforcement variation, and is not a prediction of actual crime.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}