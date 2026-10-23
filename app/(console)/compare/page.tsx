"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/components/console/Filters";
import { CrimeChips, YearRange } from "@/components/console/FilterControls";
import { InsightFeed } from "@/components/console/Modules";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";
import EChart from "@/components/charts/EChart";
import { compareLines, radarCompare, yearColumn } from "@/lib/chart-options";
import { CRIME_META, fmt } from "@/lib/analytics";
import type { ComparePayload } from "@/lib/types";

const ALL_YEARS = Array.from({ length: 21 }, (_, i) => 2001 + i);

export default function ComparePage() {
  const { crime, from, to, setRange } = useFilters();
  const [states, setStates] = useState<string[]>(["Maharashtra", "Uttar Pradesh", "Kerala"]);
  const [allStates, setAllStates] = useState<string[]>([]);
  const [data, setData] = useState<ComparePayload | null>(null);
  const [mode, setMode] = useState<"states" | "years" | "crime">("states");
  const [yearsA, setYearsA] = useState(2001);
  const [yearsB, setYearsB] = useState(2021);
  const [crimeA, setCrimeA] = useState("rape");
  const [crimeB, setCrimeB] = useState("domesticViolence");

  useEffect(() => {
    fetch("/api/meta").then((r) => r.json()).then((d) => setAllStates(d.states ?? []));
  }, []);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams();
    if (mode === "states") {
      q.set("crime", crime);
      q.set("states", states.join(","));
    } else if (mode === "years") {
      q.set("crime", crime);
      q.set("states", states.join(","));
      q.set("years", [yearsA, yearsB].join(","));
    } else {
      q.set("mode", "crime");
      q.set("crimeA", crimeA);
      q.set("crimeB", crimeB);
    }
    fetch(`/api/compare?${q}`)
      .then((r) => r.json())
      .then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [crime, states, mode, yearsA, yearsB, crimeA, crimeB]);

  const toggleState = (s: string) => {
    setStates((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : cur.length < 5 ? [...cur, s] : cur,
    );
  };

  const linesOpt = useMemo(
    () => data && compareLines(data.rows.map((r) => ({ state: r.state, color: r.color, series: r.series }))),
    [data],
  );
  const radarOpt = useMemo(
    () =>
      data &&
      radarCompare(
        data.rows.map((r) => ({
          state: r.state,
          color: r.color,
          composition: r.composition.map((c) => ({ label: c.label, value: c.value, share: c.share })),
        })),
      ),
    [data],
  );
  const barOpt = useMemo(
    () =>
      data &&
      yearColumn(
        data.rows.map((r) => ({ state: r.state, color: r.color, value: r.total })),
      ),
    [data],
  );

  const displayRows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="side-by-side intelligence"
        title="Compare"
        right={
          <div className="flex gap-1">
            <button className={`cs-chip ${mode === "states" ? "cs-chip-active" : ""}`} onClick={() => setMode("states")}>
              STATE VS STATE
            </button>
            <button className={`cs-chip ${mode === "years" ? "cs-chip-active" : ""}`} onClick={() => setMode("years")}>
              YEAR VS YEAR
            </button>
            <button className={`cs-chip ${mode === "crime" ? "cs-chip-active" : ""}`} onClick={() => setMode("crime")}>
              CRIME VS CRIME
            </button>
          </div>
        }
      />

      <Panel title="Query Filters" className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <CrimeChips crimeList={CRIME_META} />
          </div>
          <YearRange years={ALL_YEARS} from={from} to={to} onChange={setRange} />
        </div>
      </Panel>

      {mode === "states" ? (
        <Panel title="Select States (max 5)" className="!p-4" right={<Tag tone="accent">{states.length}/5</Tag>}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
            {allStates.map((s) => (
              <button
                key={s}
                onClick={() => toggleState(s)}
                className={`cs-chip !py-2 !text-left !rounded-lg ${states.includes(s) ? "cs-chip-active" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Panel>
      ) : mode === "years" ? (
        <Panel title="Select Years" className="!p-4">
          <div className="flex flex-wrap items-center gap-6 mb-4">
            <label className="font-mono text-xs text-muted flex items-center gap-2">
              EARLY
              <select className="cs-select" value={yearsA} onChange={(e) => setYearsA(Number(e.target.value))}>
                {ALL_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="font-mono text-xs text-muted flex items-center gap-2">
              LATE
              <select className="cs-select" value={yearsB} onChange={(e) => setYearsB(Number(e.target.value))}>
                {ALL_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
            {allStates.map((s) => (
              <button
                key={s}
                onClick={() => toggleState(s)}
                className={`cs-chip !py-2 !text-left !rounded-lg ${states.includes(s) ? "cs-chip-active" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel title="Select Crime Types" className="!p-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="font-mono text-xs text-muted flex items-center gap-2">
              CATEGORY A
              <select className="cs-select" value={crimeA} onChange={(e) => setCrimeA(e.target.value)}>
                {CRIME_META.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="font-mono text-xs text-muted flex items-center gap-2">
              CATEGORY B
              <select className="cs-select" value={crimeB} onChange={(e) => setCrimeB(e.target.value)}>
                {CRIME_META.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </label>
            <span className="font-mono text-[10px] text-faint uppercase tracking-widest">
              national scope · full 2001–2021 window
            </span>
          </div>
        </Panel>
      )}

      {/* Comparison table */}
      {displayRows.length > 0 && (
        <Panel title="Comparison Matrix">
          <div className="overflow-x-auto">
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {displayRows.map((r) => (
                    <th key={r.state} className="text-right">
                      <span className="inline-block" style={{ color: r.color }}>{r.state}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total cases</td>
                  {displayRows.map((r) => <td key={r.state} className="text-right text-foreground font-semibold">{fmt(r.total)}</td>)}
                </tr>
                <tr>
                  <td>Annual average</td>
                  {displayRows.map((r) => <td key={r.state} className="text-right">{fmt(r.avg)}</td>)}
                </tr>
                <tr>
                  <td>Growth (window)</td>
                  {displayRows.map((r) => (
                    <td key={r.state} className={`text-right ${r.growth === null ? "text-faint" : r.growth > 0 ? "text-danger" : "text-primary"}`}>
                      {r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${r.growth}%`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Peak year</td>
                  {displayRows.map((r) => <td key={r.state} className="text-right">{r.peakYear} <span className="text-faint">({fmt(r.peakValue ?? 0)})</span></td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Trend Lines">
          {linesOpt && <EChart option={linesOpt} height={340} />}
        </Panel>
        {mode === "crime" ? (
          <Panel title="Category Growth" right={<Tag tone="accent">ANNUAL</Tag>}>
            {barOpt && <EChart option={barOpt} height={340} />}
          </Panel>
        ) : (
          <Panel title="Composition Radar">
            {radarOpt && <EChart option={radarOpt} height={340} />}
          </Panel>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Total Caseload">
          {barOpt && <EChart option={barOpt} height={320} />}
        </Panel>
        <Panel title="Intelligence Brief" right={<Tag tone="warning">AUTO</Tag>}>
          <InsightFeed insights={data?.insights ?? []} />
        </Panel>
      </div>
    </div>
  );
}