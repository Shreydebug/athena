"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EChart from "@/components/charts/EChart";
import { trendOption } from "@/lib/chart-options";
import {
  CRIME_DIVISIONS,
  divisionTotals,
  topStatesForCrime,
  crimeMeta,
  fmt,
  peakYear,
} from "@/lib/analytics";
import type { CrimeKey, DashboardPayload } from "@/lib/types";

type Props = {
  data: DashboardPayload;
  onPickCrime?: (c: CrimeKey | "all") => void;
};

/**
 * Total → Division → Crime → Dossier drill-down.
 * Timelines are NEVER auto-shown here — the dossier reveals a
 * mini-trend only behind an explicit "show timeline" toggle.
 */
export default function CrimeHierarchy({ data, onPickCrime }: Props) {
  const router = useRouter();
  const [divisionKey, setDivisionKey] = useState<string | null>(null);
  const [crimeKey, setCrimeKey] = useState<CrimeKey | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const divisions = useMemo(
    () => divisionTotals(data.crimeComposition.map((c) => ({ key: c.key, value: c.value }))),
    [data],
  );
  const grandTotal = data.crimeComposition.reduce((a, c) => a + c.value, 0);

  const activeDivision = CRIME_DIVISIONS.find((d) => d.key === divisionKey) ?? null;

  const divisionCrimes = useMemo(() => {
    if (!activeDivision) return [];
    const divTotal =
      divisions.find((d) => d.division.key === activeDivision.key)?.value ?? 1;
    return activeDivision.crimes
      .map((k) => {
        const row = data.crimeComposition.find((c) => c.key === k);
        const value = row?.value ?? 0;
        return {
          key: k,
          label: row?.label ?? crimeMeta(k)?.label ?? k,
          color: row?.color ?? crimeMeta(k)?.color ?? "#fff",
          value,
          shareDiv: divTotal ? Math.round((value / divTotal) * 1000) / 10 : 0,
          shareAll: grandTotal ? Math.round((value / grandTotal) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [activeDivision, data, divisions, grandTotal]);

  const dossier = useMemo(() => {
    if (!crimeKey) return null;
    const row = data.crimeComposition.find((c) => c.key === crimeKey);
    const series = data.national.map((n) => ({
      year: n.year,
      value: n.byCrime[crimeKey] ?? 0,
    }));
    const pk = peakYear(series);
    const tops = topStatesForCrime(data.stateComposition, crimeKey, 5);
    const div = CRIME_DIVISIONS.find((d) => d.crimes.includes(crimeKey));
    const divValue =
      divisions.find((d) => d.division.key === div?.key)?.value ?? 0;
    return { row, series, peak: pk, tops, div, divValue };
  }, [crimeKey, data, divisions]);

  const dossierTrend = useMemo(
    () => (dossier ? trendOption(dossier.series) : null),
    [dossier],
  );

  const reset = () => {
    setDivisionKey(null);
    setCrimeKey(null);
    setShowTimeline(false);
  };

  return (
    <div className="hierarchy-root">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 mb-5 font-mono text-[10px] uppercase tracking-[0.18em]">
        <button
          onClick={reset}
          className={`hierarchy-crumb ${!divisionKey ? "hierarchy-crumb-active" : ""}`}
        >
          ◧ Total · {fmt(grandTotal)}
        </button>
        {activeDivision && (
          <>
            <span className="text-faint">/</span>
            <button
              onClick={() => {
                setCrimeKey(null);
                setShowTimeline(false);
              }}
              className={`hierarchy-crumb ${activeDivision && !crimeKey ? "hierarchy-crumb-active" : ""}`}
            >
              {activeDivision.icon} {activeDivision.label}
            </button>
          </>
        )}
        {crimeKey && dossier?.row && (
          <>
            <span className="text-faint">/</span>
            <span className="hierarchy-crumb hierarchy-crumb-active">
              {dossier.row.label}
            </span>
          </>
        )}
        {(divisionKey || crimeKey) && (
          <button onClick={reset} className="ml-auto cs-btn !py-1 !px-2">
            ↺ reset
          </button>
        )}
      </div>

      {/* LEVEL 0 — divisions */}
      {!activeDivision && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {divisions.map(({ division, value, share }, i) => {
            const topCrimeKey = division.crimes
              .map((k) => ({
                k,
                v: data.crimeComposition.find((c) => c.key === k)?.value ?? 0,
              }))
              .sort((a, b) => b.v - a.v)[0];
            const topLabel =
              data.crimeComposition.find((c) => c.key === topCrimeKey?.k)?.label ?? "";
            return (
              <button
                key={division.key}
                onClick={() => setDivisionKey(division.key)}
                className="hierarchy-card text-left float-in"
                style={{ animationDelay: `${i * 70}ms`, ["--div" as string]: division.color }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="hierarchy-icon">{division.icon}</span>
                  <span className="hierarchy-div-label">{division.label}</span>
                </div>
                <p className="hierarchy-tagline">{division.tagline}</p>
                <p className="hierarchy-big">{fmt(value)}</p>
                <div className="hierarchy-bar">
                  <div className="hierarchy-fill" style={{ width: `${share}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-muted">
                  <span>{share}% of all cases</span>
                  <span className="text-faint">led by {topLabel} →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* LEVEL 1 — crimes inside a division */}
      {activeDivision && !crimeKey && (
        <div className="float-in">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: activeDivision.color }}>
                {activeDivision.icon} Division · {activeDivision.crimes.length} categories
              </p>
              <h3 className="hierarchy-h">{activeDivision.label}</h3>
              <p className="font-mono text-[11px] text-muted">{activeDivision.tagline}</p>
            </div>
            <button onClick={() => setDivisionKey(null)} className="cs-btn shrink-0">
              ← all divisions
            </button>
          </div>
          <div className={`grid grid-cols-1 ${divisionCrimes.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
            {divisionCrimes.map((c, i) => (
              <button
                key={c.key}
                onClick={() => {
                  setCrimeKey(c.key);
                  setShowTimeline(false);
                }}
                className="hierarchy-sub text-left float-in"
                style={{ animationDelay: `${i * 60}ms`, ["--div" as string]: c.color }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">
                    {c.label}
                  </span>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground tabular-nums">{fmt(c.value)}</p>
                <div className="hierarchy-bar !h-1.5 mt-2">
                  <div className="hierarchy-fill" style={{ width: `${c.shareDiv}%`, background: c.color }} />
                </div>
                <div className="flex justify-between mt-1.5 font-mono text-[10px] text-muted">
                  <span>{c.shareDiv}% of division</span>
                  <span>{c.shareAll}% of India →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LEVEL 2 — crime dossier */}
      {crimeKey && dossier?.row && (
        <div className="hierarchy-dossier float-in">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                {dossier.div?.label} / dossier
              </p>
              <h3 className="hierarchy-h flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: dossier.row.color }} />
                {dossier.row.label}
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCrimeKey(null);
                  setShowTimeline(false);
                }}
                className="cs-btn"
              >
                ← {dossier.div?.label}
              </button>
              {onPickCrime && (
                <button onClick={() => onPickCrime(crimeKey)} className="cs-btn !border-primary !text-primary">
                  filter to this crime ⇢
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { l: "Cases in window", v: fmt(dossier.row.value) },
              { l: "Share of India", v: `${dossier.row.share}%` },
              {
                l: "Share of division",
                v: dossier.divValue
                  ? `${Math.round((dossier.row.value / dossier.divValue) * 1000) / 10}%`
                  : "—",
              },
              {
                l: "Peak year",
                v: dossier.peak ? `${dossier.peak.year}` : "—",
                s: dossier.peak ? `${fmt(dossier.peak.value)} cases` : "",
              },
            ].map((s) => (
              <div key={s.l} className="hierarchy-stat">
                <p className="hierarchy-stat-l">{s.l}</p>
                <p className="hierarchy-stat-v">{s.v}</p>
                {s.s && <p className="font-mono text-[10px] text-muted mt-1">{s.s}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="panel-title mb-3">Top states — this crime</p>
              <div className="space-y-2.5">
                {dossier.tops.map((t, i) => (
                  <button
                    key={t.state}
                    onClick={() => router.push(`/state/${encodeURIComponent(t.state)}`)}
                    className="w-full text-left group"
                    title={`Open ${t.state} dossier`}
                  >
                    <div className="flex justify-between font-mono text-[11px] mb-1">
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        <span className="text-faint mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {t.state}
                      </span>
                      <span className="text-muted tabular-nums">
                        {fmt(t.value)} · {t.share}%
                      </span>
                    </div>
                    <div className="hierarchy-bar">
                      <div
                        className="hierarchy-fill"
                        style={{
                          width: `${dossier.tops[0] ? (t.value / dossier.tops[0].value) * 100 : 0}%`,
                          background: dossier.row?.color ?? "#00F5D4",
                        }}
                      />
                    </div>
                  </button>
                ))}
                {!dossier.tops.length && (
                  <p className="font-mono text-[11px] text-faint">no reports in this window</p>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="panel-title">Temporal lens</p>
                <button
                  onClick={() => setShowTimeline((s) => !s)}
                  className="cs-btn !py-1 !px-2"
                  aria-expanded={showTimeline}
                >
                  {showTimeline ? "■ hide timeline" : "▶ show timeline"}
                </button>
              </div>
              {showTimeline ? (
                dossierTrend && <EChart option={dossierTrend} height={260} />
              ) : (
                <div className="hierarchy-timeline-tease">
                  <p className="font-mono text-[11px] text-muted leading-relaxed">
                    Year-by-year curve is tucked away on purpose — this dossier stays
                    structural first. Reveal it only when you need the chronology.
                  </p>
                  <div className="flex gap-1.5 mt-3" aria-hidden>
                    {dossier.series
                      .filter((_, i) => i % 3 === 0)
                      .map((p) => (
                        <span
                          key={p.year}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${8 + (p.value / Math.max(...dossier.series.map((s) => s.value), 1)) * 36}px`,
                            background: `${dossier.row?.color ?? "#00F5D4"}33`,
                            borderTop: `2px solid ${dossier.row?.color ?? "#00F5D4"}`,
                          }}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
