"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/components/console/Filters";
import { InsightFeed, RankingsTable } from "@/components/console/Modules";
import CrimeHierarchy from "@/components/console/CrimeHierarchy";
import StatChronology, { type StatLens } from "@/components/console/StatChronology";
import { Panel, Tag } from "@/components/ui/Panel";
import { StatCard, DeltaTag } from "@/components/ui/StatCard";
import IndiaMap from "@/components/IndiaMap";
import { fmt } from "@/lib/analytics";
import type { DashboardPayload } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function OverviewPage() {
  const { crime, from, to, setCrime } = useFilters();
  const router = useRouter();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lens, setLens] = useState<StatLens | null>(null);

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
        /* aborted or failed — keep previous data */
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

  const sparkTotal = useMemo(
    () => data?.national.map((n) => n.total) ?? [],
    [data],
  );
  const yearSeries = useMemo(
    () => data?.national.map((n) => ({ year: n.year, value: n.total })) ?? [],
    [data],
  );

  const crimeLabel = data?.meta.crimeList.find((c) => c.key === crime)?.label ?? "All Crimes";
  const tap = (l: StatLens) => setLens((cur) => (cur === l ? null : l));

  return (
    <div className="space-y-6">
      {/* Editorial lede — single title, no duplicate SectionHeader */}
      <div className="dossier-lede">
        <div className="stop-photo" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <p className="dossier-kicker">Athena field dossier · NCRB 2001–2021</p>
          {loading ? (
            <Tag tone="muted">syncing…</Tag>
          ) : (
            <div className="flex gap-2 shrink-0">
              <Tag>{crimeLabel}</Tag>
              <Tag tone="accent">{from}–{to}</Tag>
            </div>
          )}
        </div>
        <h1 className="overview-giant">
          Crime Against <span className="overview-giant-sub">Women</span>
        </h1>
        <p className="dossier-headline" style={{ fontSize: "1.05rem", marginTop: "12px" }}>
          Not one crime wave — <em>three different kinds</em> of violence, moving on
          different clocks.
        </p>
        <p className="dossier-sub">
          Start from the divisions below. Click a division to open its crimes, click a
          crime to open its dossier — states, peak year, share. Tap any headline number
          to reveal its chronological graph.
        </p>
      </div>

      {/* Hero stats — tap a card to reveal its chronological graph */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Cases"
              value={data.hero.total}
              tone="primary"
              delay={0}
              kicker={`${data.filters.from}–${data.filters.to}`}
              spark={sparkTotal}
              onClick={() => tap("total")}
              selected={lens === "total"}
              sub={
                <span>
                  {data.hero.dominantCrime
                    ? `led by ${data.hero.dominantCrime.label} · ${data.hero.dominantCrime.share}%`
                    : "window total"}
                </span>
              }
            />
            <StatCard
              label="Avg / Year"
              value={data.hero.avgPerYear}
              tone="info"
              delay={60}
              spark={sparkTotal}
              sparkColor="#38BDF8"
              onClick={() => tap("avg")}
              selected={lens === "avg"}
              sub={<DeltaTag value={data.hero.yoy} />}
            />
            <StatCard
              label="Peak Year"
              value={data.hero.peakYear?.year ?? 0}
              tone="warning"
              delay={120}
              format={(v) => String(v)}
              kicker="inflection"
              onClick={() => tap("peak")}
              selected={lens === "peak"}
              sub={
                data.hero.peakYear ? (
                  <span>{fmt(data.hero.peakYear.value)} cases recorded</span>
                ) : null
              }
            />
            <StatCard
              label={crime === "all" ? "Dominant Crime" : "States Reporting"}
              value={
                crime === "all"
                  ? (data.hero.dominantCrime?.value ?? 0)
                  : data.hero.statesIncluded
              }
              tone="accent"
              delay={180}
              onClick={() => tap("context")}
              selected={lens === "context"}
              sub={
                crime === "all" && data.hero.dominantCrime ? (
                  <span>
                    {data.hero.dominantCrime.label} · {data.hero.dominantCrime.share}% of total
                  </span>
                ) : (
                  <span>
                    {data.hero.statesIncluded} entities · {fmt(data.hero.total)} cases
                  </span>
                )
              }
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
        </>
      )}

      {/* Hierarchy explorer — the hero, replaces donut + forced trend */}
      {data && (
        <Panel
          title="Case Anatomy — click to drill down"
          corners
          right={<Tag tone="warning">TOTAL → DIVISION → CRIME → DOSSIER</Tag>}
        >
          <CrimeHierarchy data={data} onPickCrime={(c) => setCrime(c)} />
        </Panel>
      )}

      {/* Map + rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel
          title="Burden Atlas"
          corners
          className="xl:col-span-2"
          right={
            <span className="font-mono text-[9px] text-faint uppercase tracking-widest">
              click state → dossier
            </span>
          }
        >
          {data && (
            <IndiaMap
              data={data.map}
              onSelect={(s) => router.push(`/state/${encodeURIComponent(s)}`)}
            />
          )}
        </Panel>
        <Panel title="Heaviest Burdens" right={<Tag tone="accent">TOP 7</Tag>}>
          {data && <RankingsTable rows={data.rankings} limit={7} />}
          <p className="font-mono text-[10px] text-faint mt-3 leading-relaxed">
            Ranked by recorded caseload in {from}–{to}. Growth is window-start → window-end,
            not a trend line.
          </p>
        </Panel>
      </div>

      {/* Insights */}
      <Panel title="Field Notes" right={<Tag tone="warning">AUTO-READ</Tag>}>
        {data && <InsightFeed insights={data.insights} />}
      </Panel>
    </div>
  );
}
