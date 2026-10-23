"use client";

import { ReactNode } from "react";
import { CountUp } from "./CountUp";
import { Tag } from "./Panel";

export function Spark({ data, color = "currentColor", width = 120, height = 32 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - 3 - ((v - min) / span) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const lastY = height - 3 - ((last - min) / span) * (height - 6);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <circle cx={width} cy={lastY} r="2.4" fill={color} />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  format,
  sub,
  tone = "primary",
  icon,
  delay = 0,
  spark,
  sparkColor,
  kicker,
  onClick,
  selected,
}: {
  label: string;
  value: number;
  format?: (v: number) => string;
  sub?: ReactNode;
  tone?: "primary" | "accent" | "warning" | "danger" | "info";
  icon?: ReactNode;
  delay?: number;
  spark?: number[];
  sparkColor?: string;
  kicker?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    accent: "text-accent",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
  };
  const stroke: Record<string, string> = {
    primary: "#00F5D4",
    accent: "#8B5CF6",
    warning: "#FFD166",
    danger: "#FF4D6D",
    info: "#38BDF8",
  };
  const body = (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="panel-title !text-[0.6rem]">{label}</p>
        {kicker ? (
          <span className="font-mono text-[9px] uppercase tracking-widest text-faint">{kicker}</span>
        ) : (
          icon
        )}
      </div>
      <p
        className={`font-mono text-[1.7rem] md:text-[2rem] leading-none font-bold glow-text count-up-num ${tones[tone]}`}
        style={{ fontFamily: "var(--font-jbmono)" }}
      >
        <CountUp value={value} format={format} />
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-[11px] text-muted font-mono min-w-0">{sub}</div>
        {spark && spark.length > 1 && (
          <div className={`shrink-0 ${tones[tone]}`}>
            <Spark data={spark} color={sparkColor ?? stroke[tone]} />
          </div>
        )}
      </div>
      {onClick && (
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
          {selected ? "■ tap again to close" : "▶ tap for chronology"}
        </p>
      )}
    </>
  );
  if (!onClick) {
    return (
      <div
        className="panel panel-corners card-hover p-4 float-in stat-redesign"
        style={{ animationDelay: `${delay}ms` }}
      >
        {body}
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`panel panel-corners card-hover p-4 float-in stat-redesign text-left w-full stat-clickable ${selected ? "stat-selected" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {body}
    </button>
  );
}

export function DeltaTag({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <Tag tone="muted">n/a</Tag>;
  const up = invert ? value < 0 : value > 0;
  const label = `${value > 0 ? "+" : ""}${value}%`;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wider ${
        up ? "text-danger border-danger/40 bg-danger/5" : "text-primary border-primary/40 bg-primary/5"
      }`}
    >
      {label}
    </span>
  );
}