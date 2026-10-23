"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/analytics";

export function TimelinePlayer({
  years,
  from,
  to,
  onChange,
}: {
  years: number[];
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [year, setYear] = useState(from);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  if (from !== year && !playing) setYear(from);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setYear((y) => {
        const idx = years.indexOf(y);
        if (idx >= years.length - 1) {
          setPlaying(false);
          return y;
        }
        const next = years[idx + 1];
        onChange(next, next);
        return next;
      });
    }, 900);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, years]);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    setPlaying(false);
    onChange(from, to);
    setYear(from);
  };

  const idx = years.indexOf(year);
  const pct = (idx / (years.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => (playing ? stop() : setPlaying(true))}
          className={`cs-btn ${playing ? "!text-danger !border-danger/60" : ""}`}
          aria-label={playing ? "Stop playback" : "Play timeline"}
        >
          {playing ? "■ HALT" : "▶ PLAYBACK"}
        </button>
        <button onClick={stop} className="cs-btn !text-muted" disabled={year === from && !playing}>
          ↺ RESET
        </button>
        <span className="ml-auto font-display text-2xl text-primary glow-text tabular-nums">
          {year}
        </span>
        <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
          {idx + 1}/{years.length}
        </span>
      </div>
      <div className="relative">
        <div className="tl-track">
          <div className="tl-fill" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={years.length - 1}
          value={idx}
          onChange={(e) => {
            const y = years[Number(e.target.value)];
            setYear(y);
            onChange(y, y);
          }}
          className="absolute top-1/2 -translate-y-1/2 w-full h-6 opacity-0 cursor-pointer"
          aria-label="Timeline year"
        />
        <div className="tl-thumb" style={{ left: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1 font-mono text-[9px] text-faint">
        {years.map((y) => (
          <span key={y} className={y === year ? "text-primary" : ""}>
            {y}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RankingsTable({
  rows,
  limit = 10,
}: {
  rows: Array<{ rank: number; state: string; value: number; share: number; growth: number | null }>;
  limit?: number;
}) {
  const router = useRouter();
  const shown = rows.slice(0, limit);
  return (
    <div className="overflow-x-auto">
      <table className="cs-table">
        <thead>
          <tr>
            <th>#</th>
            <th>State / UT</th>
            <th className="text-right">Cases</th>
            <th className="text-right">Share</th>
            <th className="text-right">Growth</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr
              key={r.state}
              className="cursor-pointer"
              onClick={() => router.push(`/state/${encodeURIComponent(r.state)}`)}
              title={`Open ${r.state} analytics`}
            >
              <td className="text-primary font-bold">{String(r.rank).padStart(2, "0")}</td>
              <td className="text-foreground">{r.state}</td>
              <td className="text-right text-foreground font-semibold">{fmt(r.value)}</td>
              <td className="text-right text-muted">{r.share}%</td>
              <td className={`text-right ${r.growth === null ? "text-faint" : r.growth > 0 ? "text-danger" : "text-primary"}`}>
                {r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${r.growth}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InsightFeed({
  insights,
}: {
  insights: Array<{ severity: "alert" | "warning" | "info" | "positive"; title: string; text: string; metric?: string }>;
}) {
  const icon: Record<string, string> = { alert: "▲", warning: "◆", info: "●", positive: "✓" };
  const color: Record<string, string> = {
    alert: "text-danger border-danger/40",
    warning: "text-warning border-warning/40",
    info: "text-primary border-primary/40",
    positive: "text-secondary border-secondary/40",
  };
  if (!insights.length) return <p className="font-mono text-xs text-faint uppercase tracking-widest">no signal detected</p>;
  return (
    <div className="space-y-3">
      {insights.map((ins, i) => (
        <div
          key={i}
          className="border rounded-lg p-3 bg-raise/40 float-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`${color[ins.severity]} border rounded px-1.5 py-0.5 text-[10px] font-mono`}>
              {icon[ins.severity]} {ins.severity}
            </span>
            {ins.metric && (
              <span className="ml-auto font-mono text-[10px] text-primary tabular-nums">{ins.metric}</span>
            )}
          </div>
          <p className="font-display text-[13px] text-foreground uppercase tracking-wider mb-1">{ins.title}</p>
          <p className="font-mono text-[11px] text-muted leading-relaxed">{ins.text}</p>
        </div>
      ))}
    </div>
  );
}