"use client";

import { useMemo } from "react";
import EChart, { axis, chartTheme } from "@/components/charts/EChart";
import { fmt, fmtCompact } from "@/lib/analytics";
import type { CrimeKey, CrimeMeta } from "@/lib/types";

export type StatLens = "total" | "avg" | "peak" | "context";

type BreakdownRow = { year: number; total: number; byCrime: Partial<Record<CrimeKey, number>> };

const LENS_COPY: Record<StatLens, { title: string; hint: string }> = {
  total: { title: "All categories — yearly trends", hint: "each line is one crime category" },
  avg: { title: "Chronology — against the average", hint: "dashed line is the window mean" },
  peak: { title: "Chronology — the peak year", hint: "marked point is the window maximum" },
  context: { title: "Dominant crime — yearly trend", hint: "solo trend for the leading category" },
};

/** One chronological graph per hero stat — rendered only when its card is tapped.
 *  - Total card → all 7 crime categories (when breakdown + crimeList provided)
 *  - Dominant card (context lens) → only the dominant crime (when breakdown + focusKey provided)
 */
export default function StatChronology({
  lens,
  series,
  breakdown,
  crimeList,
  focusKey,
  focusLabel,
  focusColor,
  onClose,
}: {
  lens: StatLens;
  series: Array<{ year: number; value: number }>;
  breakdown?: BreakdownRow[];
  crimeList?: CrimeMeta[];
  focusKey?: CrimeKey;
  focusLabel?: string;
  focusColor?: string;
  onClose: () => void;
}) {
  const focusMeta = crimeList?.find((c) => c.key === focusKey);
  const resolvedFocusLabel = focusLabel ?? focusMeta?.label ?? "Dominant crime";
  const resolvedFocusColor = focusColor ?? focusMeta?.color ?? "#38BDF8";
  const copy =
    lens === "context" && focusKey
      ? { title: `${resolvedFocusLabel} — yearly trend`, hint: `solo trend · ${resolvedFocusLabel} only` }
      : LENS_COPY[lens];

  const option = useMemo(() => {
    const years = (breakdown ?? series).map((p) => p.year);
    const values = series.map((p) => p.value);
    const avg = values.length ? values.reduce((a, v) => a + v, 0) / values.length : 0;
    const peakIdx = values.indexOf(Math.max(...values, 0));
    const running: number[] = [];
    values.reduce((acc, v, i) => {
      const c = acc + v;
      running[i] = c;
      return c;
    }, 0);

    const base = {
      ...chartTheme,
      animationDuration: 700,
      animationEasing: "cubicOut",
      tooltip: {
        ...chartTheme.tooltip,
        trigger: "axis",
        valueFormatter: (v: unknown) => fmt(Number(v)),
      },
      grid: { left: 52, right: 18, top: lens === "total" && breakdown?.length ? 42 : 16, bottom: 30 },
      xAxis: { ...axis, type: "category", data: years, boundaryGap: false },
      yAxis: { ...axis, type: "value", axisLabel: { ...axis.axisLabel, formatter: (v: number) => fmtCompact(v) } },
    } as const;

    // TOTAL → all crime categories (one line per category)
    if (lens === "total" && breakdown?.length && crimeList?.length) {
      return {
        ...base,
        legend: {
          top: 0,
          type: "scroll",
          textStyle: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
        },
        series: crimeList.map((c) => ({
          name: c.label,
          type: "line",
          smooth: 0.35,
          symbol: "none",
          data: breakdown.map((n) => n.byCrime[c.key] ?? 0),
          lineStyle: { width: 2, color: c.color },
          itemStyle: { color: c.color },
          areaStyle: { color: c.color, opacity: 0.05 },
        })),
      };
    }

    // CONTEXT (dominant card) → solo trend for the dominant crime only
    if (lens === "context" && focusKey && breakdown?.length) {
      const focusValues = breakdown.map((n) => n.byCrime[focusKey] ?? 0);
      const focusPeakIdx = focusValues.indexOf(Math.max(...focusValues, 0));
      return {
        ...base,
        series: [
          {
            type: "line",
            smooth: 0.35,
            symbol: "circle",
            symbolSize: 5,
            showSymbol: false,
            name: resolvedFocusLabel,
            data: focusValues,
            lineStyle: { width: 2.5, color: resolvedFocusColor, shadowColor: `${resolvedFocusColor}66`, shadowBlur: 10 },
            itemStyle: { color: resolvedFocusColor },
            areaStyle: {
              color: {
                type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: `${resolvedFocusColor}48` },
                  { offset: 1, color: `${resolvedFocusColor}03` },
                ],
              },
            },
            markPoint: {
              symbol: "pin",
              symbolSize: 44,
              itemStyle: { color: resolvedFocusColor },
              label: { color: "#fff", fontSize: 9, fontFamily: "JetBrains Mono, monospace" },
              data: [{ name: "peak", coord: [years[focusPeakIdx], focusValues[focusPeakIdx]], value: fmt(focusValues[focusPeakIdx] ?? 0) }],
            },
          },
        ],
      };
    }

    if (lens === "avg") {
      return {
        ...base,
        series: [
          {
            type: "bar",
            data: values,
            barWidth: "52%",
            itemStyle: { color: "rgba(56,189,248,0.55)", borderRadius: [4, 4, 0, 0] },
            markLine: {
              symbol: "none",
              lineStyle: { color: "#FFD166", type: "dashed", width: 2 },
              label: { color: "#FFD166", fontFamily: "JetBrains Mono, monospace", fontSize: 10, formatter: `avg ${fmt(Math.round(avg))}` },
              data: [{ yAxis: Math.round(avg) }],
            },
          },
        ],
      };
    }
    if (lens === "peak") {
      return {
        ...base,
        series: [
          {
            type: "line",
            smooth: 0.35,
            symbol: "circle",
            symbolSize: 5,
            showSymbol: false,
            data: values,
            lineStyle: { width: 2.5, color: "#FFD166", shadowColor: "rgba(255,209,102,0.35)", shadowBlur: 10 },
            itemStyle: { color: "#FFD166" },
            areaStyle: {
              color: {
                type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(255,209,102,0.28)" },
                  { offset: 1, color: "rgba(255,209,102,0.01)" },
                ],
              },
            },
            markPoint: {
              symbol: "pin",
              symbolSize: 44,
              itemStyle: { color: "#FF4D6D" },
              label: { color: "#fff", fontSize: 9, fontFamily: "JetBrains Mono, monospace" },
              data: [{ name: "peak", coord: [years[peakIdx], values[peakIdx]], value: fmt(values[peakIdx] ?? 0) }],
            },
            markLine: {
              symbol: "none",
              lineStyle: { color: "rgba(255,77,109,0.6)", type: "dashed" },
              label: { color: "#FF4D6D", fontFamily: "JetBrains Mono, monospace", fontSize: 10, formatter: `${years[peakIdx] ?? ""}` },
              data: [{ xAxis: years[peakIdx] }],
            },
          },
        ],
      };
    }
    if (lens === "context") {
      return {
        ...base,
        series: [
          {
            type: "line",
            smooth: 0.3,
            symbol: "none",
            data: running,
            lineStyle: { width: 2.5, color: "#8B5CF6", shadowColor: "rgba(139,92,246,0.4)", shadowBlur: 10 },
            itemStyle: { color: "#8B5CF6" },
            areaStyle: {
              color: {
                type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(139,92,246,0.30)" },
                  { offset: 1, color: "rgba(139,92,246,0.01)" },
                ],
              },
            },
          },
        ],
      };
    }
    return {
      ...base,
      series: [
        {
          type: "line",
          smooth: 0.35,
          symbol: "circle",
          symbolSize: 5,
          showSymbol: false,
          data: values,
          lineStyle: { width: 2.5, color: "#00F5D4", shadowColor: "rgba(0,245,212,0.4)", shadowBlur: 10 },
          itemStyle: { color: "#00F5D4" },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(0,245,212,0.28)" },
                { offset: 1, color: "rgba(0,245,212,0.01)" },
              ],
            },
          },
        },
      ],
    };
  }, [lens, series, breakdown, crimeList, focusKey, resolvedFocusLabel, resolvedFocusColor]);

  return (
    <div className="stat-lens float-in">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="panel-title">{copy.title}</p>
          <p className="font-mono text-[10px] text-faint mt-1">{copy.hint}</p>
        </div>
        <button onClick={onClose} className="cs-btn !py-1 !px-2" aria-label="Close chronological graph">
          ■ close
        </button>
      </div>
      <EChart option={option} height={lens === "total" && breakdown?.length && crimeList?.length ? 340 : 280} />
    </div>
  );
}
