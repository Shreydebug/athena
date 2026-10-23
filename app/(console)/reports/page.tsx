"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useFilters } from "@/components/console/Filters";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";
import { fmt } from "@/lib/analytics";
import type { DashboardPayload } from "@/lib/types";

interface SavedReport {
  id: string;
  label: string;
  createdAt: string;
  total: number;
}

export default function ReportsPage() {
  const { crime, from, to } = useFilters();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [saved, setSaved] = useState<SavedReport[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("athena-reports") ?? "[]") as SavedReport[];
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

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

  const crimeLabel = data?.meta.crimeList.find((c) => c.key === crime)?.label ?? "All Crimes";

  const capture = async () => {
    if (!frameRef.current) return;
    setBusy("png");
    try {
      const png = await toPng(frameRef.current, {
        backgroundColor: "#050608",
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = png;
      a.download = `athena-report-${crime}-${from}-${to}.png`;
      a.click();
      const rec: SavedReport = {
        id: String(Date.now()),
        label: `${crimeLabel} · ${from}–${to}`,
        createdAt: new Date().toLocaleString("en-IN"),
        total: data?.hero.total ?? 0,
      };
      const next = [rec, ...saved].slice(0, 12);
      setSaved(next);
      localStorage.setItem("athena-reports", JSON.stringify(next));
    } finally {
      setBusy(null);
    }
  };

  const remove = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    localStorage.setItem("athena-reports", JSON.stringify(next));
  };

  const csvUrl = `/api/export/csv?from=${from}&to=${to}${crime !== "all" ? `&crime=${crime}` : ""}`;

  return (
    <div className="space-y-6">
      <SectionHeader kicker="output & dissemination" title="Reports" right={<Tag tone="accent">EXPORT CENTER</Tag>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Export Actions" right={<Tag>READY</Tag>}>
          <div className="space-y-3">
            <a href={csvUrl} className="cs-btn w-full !text-left flex items-center gap-3">
              <span>⬇</span> Download CSV
            </a>
            <button className="cs-btn w-full !text-left flex items-center gap-3" onClick={capture} disabled={busy === "png"}>
              <span>▦</span> {busy === "png" ? "Rendering…" : "Capture PNG Report"}
            </button>
            <button className="cs-btn w-full !text-left flex items-center gap-3" onClick={() => window.print()}>
              <span>▤</span> Print / Save PDF
            </button>
            <p className="font-mono text-[10px] text-faint leading-relaxed pt-1">
              CSV serves the full record-level dataset for the current filters. PNG and PDF
              capture the generated report frame below.
            </p>
          </div>
        </Panel>

        <Panel title="Saved Reports" right={<Tag tone="muted">{saved.length}</Tag>} className="lg:col-span-2">
          {saved.length === 0 ? (
            <p className="font-mono text-[11px] text-faint uppercase tracking-widest py-6 text-center">
              no reports captured yet
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {saved.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border border-border rounded-lg px-3 py-2.5">
                  <span className="text-primary">▤</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-foreground truncate">{s.label}</p>
                    <p className="font-mono text-[10px] text-faint">{s.createdAt} · {fmt(s.total)} cases</p>
                  </div>
                  <button className="cs-btn !px-2 !py-1 !text-[10px]" onClick={() => remove(s.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Printable / capturable report frame */}
      <div className="export-frame" aria-hidden>
        <div ref={frameRef} className="w-[1200px] bg-[#050608] p-10 font-mono">
          <div className="flex items-center justify-between border-b border-primary/30 pb-4 mb-6">
            <div>
              <p className="text-primary font-display text-2xl tracking-[0.3em]" style={{ fontFamily: "var(--font-pixel)" }}>
                ATHENA
              </p>
              <p className="text-muted text-[11px] mt-1">India Crime Intelligence Platform · NCRB 2001–2021</p>
            </div>
            <div className="text-right text-[11px] text-muted">
              <p>{crimeLabel}</p>
              <p>Window {from}–{to}</p>
            </div>
          </div>

          {data && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  ["Total Cases", fmt(data.hero.total)],
                  ["Avg / Year", fmt(data.hero.avgPerYear)],
                  ["States", String(data.hero.statesIncluded)],
                  ["Growth", data.hero.yoy === null ? "n/a" : `${data.hero.yoy > 0 ? "+" : ""}${data.hero.yoy}%`],
                ].map(([k, v]) => (
                  <div key={k} className="border border-primary/30 rounded-lg p-4">
                    <p className="text-[10px] text-muted uppercase tracking-widest">{k}</p>
                    <p className="text-primary text-xl font-bold mt-2">{v}</p>
                  </div>
                ))}
              </div>

              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="text-primary text-[10px] uppercase tracking-widest text-left">
                    <th className="border-b border-primary/30 py-2 px-2">#</th>
                    <th className="border-b border-primary/30 py-2 px-2">State</th>
                    <th className="border-b border-primary/30 py-2 px-2 text-right">Cases</th>
                    <th className="border-b border-primary/30 py-2 px-2 text-right">Share</th>
                    <th className="border-b border-primary/30 py-2 px-2 text-right">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankings.slice(0, 15).map((r) => (
                    <tr key={r.state} className="text-muted">
                      <td className="py-1.5 px-2 text-primary">{r.rank}</td>
                      <td className="py-1.5 px-2 text-foreground">{r.state}</td>
                      <td className="py-1.5 px-2 text-right text-foreground">{fmt(r.value)}</td>
                      <td className="py-1.5 px-2 text-right">{r.share}%</td>
                      <td className="py-1.5 px-2 text-right">{r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${r.growth}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 border-t border-primary/30 pt-4 text-[10px] text-faint leading-relaxed">
                {data.insights.slice(0, 3).map((ins, i) => (
                  <p key={i} className="mb-1.5">
                    <span className="text-primary uppercase">[{ins.severity}]</span> {ins.title} — {ins.text}
                  </p>
                ))}
                <p className="mt-3">
                  Generated by ATHENA v1.0 · Data: National Crime Records Bureau (crimes against women, 2001–2021).
                  Analytical preview only; not official statistics.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}