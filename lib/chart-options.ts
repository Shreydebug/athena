import type { EChartsCoreOption } from "echarts/core";
import { axis, chartTheme } from "@/components/charts/EChart";
import { fmt, fmtCompact } from "./analytics";

export const PALETTE = ["#00F5D4", "#8B5CF6", "#FFD166", "#FF4D6D", "#38BDF8", "#F472B6", "#64FFDA"];

export function trendOption(
  series: Array<{ year: number; value: number }>,
  extra: Array<{ name: string; color: string; data: Array<{ year: number; value: number }> }> = [],
  label = "cases",
  forecast: Array<{ year: number; value: number; forecast: boolean }> = [],
): EChartsCoreOption {
  const main = {
    name: label,
    type: "line" as const,
    smooth: 0.35,
    symbol: "circle",
    symbolSize: 5,
    showSymbol: false,
    data: series.map((p) => [p.year, p.value]),
    lineStyle: { width: 2.5, color: PALETTE[0], shadowColor: "rgba(0,245,212,0.4)", shadowBlur: 10 },
    itemStyle: { color: PALETTE[0] },
    areaStyle: {
      color: {
        type: "linear",
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: "rgba(0,245,212,0.28)" },
          { offset: 1, color: "rgba(0,245,212,0.01)" },
        ],
      },
    },
    animationDuration: 700,
    animationEasing: "cubicOut",
  };
  const extraSeries = extra.map((s) => ({
    name: s.name,
    type: "line" as const,
    smooth: 0.3,
    symbol: "circle",
    symbolSize: 4,
    showSymbol: false,
    data: s.data.map((p) => [p.year, p.value]),
    lineStyle: { width: 1.8, color: s.color },
    itemStyle: { color: s.color },
    animationDuration: 700,
    animationEasing: "cubicOut",
  }));
  const fc = forecast.length
    ? [
        {
          name: "forecast",
          type: "line" as const,
          smooth: 0.3,
          symbol: "none",
          data: forecast.map((p) => [p.year, p.value]),
          lineStyle: { width: 2, color: "#FFD166", type: "dashed", shadowColor: "rgba(255,209,102,0.35)", shadowBlur: 8 },
          itemStyle: { color: "#FFD166" },
        },
      ]
    : [];
  return {
    ...chartTheme,
    animationDurationUpdate: 500,
    tooltip: {
      ...chartTheme.tooltip,
      trigger: "axis",
      valueFormatter: (v: unknown) => fmt(Number(v)),
    },
    grid: { left: 46, right: 18, top: 20, bottom: 30 },
    xAxis: {
      ...axis,
      type: "category",
      data: [...series.map((p) => p.year), ...forecast.map((p) => p.year)],
      boundaryGap: false,
    },
    yAxis: { ...axis, type: "value", axisLabel: { ...axis.axisLabel, formatter: (v: number) => fmtCompact(v) } },
    series: [main, ...extraSeries, ...fc],
  };
}

export function compositionDonut(
  data: Array<{ label: string; value: number; color: string }>,
): EChartsCoreOption {
  return {
    ...chartTheme,
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: {
      ...chartTheme.tooltip,
      trigger: "item",
      formatter: (p: { name: string; value: number; percent: number }) =>
        `<b>${p.name}</b><br/>${fmt(p.value)} cases · ${p.percent}%`,
    },
    legend: {
      bottom: 0,
      icon: "circle",
      textStyle: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
      itemWidth: 8,
      itemHeight: 8,
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "74%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "#0b0e13", borderWidth: 2, borderRadius: 4 },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: { shadowBlur: 18, shadowColor: "rgba(0,245,212,0.35)" },
        },
        data: data.map((d) => ({ name: d.label, value: d.value, itemStyle: { color: d.color } })),
        animationType: "scale",
        animationEasing: "cubicOut",
      },
    ],
  };
}

export function rankingsBar(
  data: Array<{ state: string; value: number }>,
  limit = 12,
  color = "#00F5D4",
): EChartsCoreOption {
  const rows = [...data].sort((a, b) => a.value - b.value).slice(-limit);
  return {
    ...chartTheme,
    animationDuration: 800,
    animationEasing: "cubicOut",
    grid: { left: 120, right: 42, top: 12, bottom: 24 },
    tooltip: {
      ...chartTheme.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v: unknown) => fmt(Number(v)),
    },
    xAxis: { ...axis, type: "value", splitLine: { show: false }, axisLabel: { ...axis.axisLabel, formatter: (v: number) => fmtCompact(v) } },
    yAxis: { ...axis, type: "category", data: rows.map((r) => r.state), axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        type: "bar",
        data: rows.map((r) => ({ value: r.value, itemStyle: { color: r.value === rows[rows.length - 1].value ? color : "rgba(0,245,212,0.35)" } })),
        barWidth: "62%",
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10, formatter: (p: { value: number }) => fmtCompact(p.value) },
        animationDelay: (i: number) => i * 45,
      },
    ],
  };
}

export function radarCompare(
  rows: Array<{
    state: string;
    color: string;
    composition: Array<{ label: string; value: number; share: number }>;
  }>,
): EChartsCoreOption {
  const labels = rows[0]?.composition.map((c) => c.label) ?? [];
  return {
    ...chartTheme,
    animationDuration: 800,
    tooltip: { ...chartTheme.tooltip, trigger: "item" },
    legend: {
      bottom: 0,
      textStyle: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
    },
    radar: {
      indicator: labels.map((l) => ({ name: l, max: 100 })),
      radius: "62%",
      center: ["50%", "48%"],
      axisName: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(0,245,212,0.12)" } },
      splitArea: { areaStyle: { color: ["rgba(0,245,212,0.02)", "rgba(0,245,212,0.05)"] } },
      axisLine: { lineStyle: { color: "rgba(0,245,212,0.2)" } },
    },
    series: [
      {
        type: "radar",
        data: rows.map((r) => ({
          name: r.state,
          value: r.composition.map((c) => c.share),
          lineStyle: { color: r.color, width: 2 },
          itemStyle: { color: r.color },
          areaStyle: { color: r.color, opacity: 0.12 },
          symbolSize: 4,
        })),
        animationDuration: 900,
        animationEasing: "cubicOut",
      },
    ],
  };
}

export function heatmapCalendar(
  data: Array<[number, number, number]>,
  xLabels: number[],
  yLabels: string[],
): EChartsCoreOption {
  return {
    ...chartTheme,
    animationDuration: 800,
    tooltip: {
      ...chartTheme.tooltip,
      formatter: (p: { data: [number, number, number] }) =>
        `${yLabels[p.data[1]]} · ${xLabels[p.data[0]]}<br/>${fmt(p.data[2])} cases`,
    },
    grid: { left: 110, right: 18, top: 8, bottom: 30 },
    xAxis: { ...axis, type: "category", data: xLabels, splitArea: { show: true }, splitLine: { show: false } },
    yAxis: { ...axis, type: "category", data: yLabels, splitArea: { show: true }, splitLine: { show: false } },
    visualMap: {
      min: 0,
      max: Math.max(...data.map((d) => d[2]), 1),
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemWidth: 10,
      itemHeight: 80,
      textStyle: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 9 },
      inRange: { color: ["#0b0e13", "rgba(0,245,212,0.45)", "#00F5D4", "#FFD166", "#FF4D6D"] },
    },
    series: [
      {
        type: "heatmap",
        data,
        label: { show: true, color: "#dbe7ee", fontSize: 8, fontFamily: "JetBrains Mono, monospace", formatter: (p: { data: [number, number, number] }) => fmtCompact(p.data[2]) },
        itemStyle: { borderColor: "#050608", borderWidth: 1, borderRadius: 2 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,245,212,0.4)" } },
      },
    ],
  };
}

export function treemapStates(
  data: Array<{ state: string; value: number }>,
): EChartsCoreOption {
  const rows = [...data].sort((a, b) => b.value - a.value);
  return {
    ...chartTheme,
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: {
      ...chartTheme.tooltip,
      formatter: (p: { name: string; value: number }) => `<b>${p.name}</b><br/>${fmt(p.value)} cases`,
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        itemStyle: {
          borderColor: "#050608",
          borderWidth: 1.5,
          gapWidth: 1.5,
          borderRadius: 4,
        },
        label: {
          show: true,
          color: "#dbe7ee",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          formatter: (p: { name: string }) => p.name,
        },
        data: rows.map((r, i) => ({
          name: r.state,
          value: r.value,
          itemStyle: {
            color: `rgba(0,245,212,${0.18 + (1 - i / rows.length) * 0.7})`,
            shadowBlur: 6,
            shadowColor: "rgba(0,245,212,0.2)",
          },
        })),
        animationDurationUpdate: 700,
      },
    ],
  };
}

export function scatterOption(
  data: Array<{ state: string; x: number; y: number }>,
  xLabel: string,
  yLabel: string,
): EChartsCoreOption {
  return {
    ...chartTheme,
    animationDuration: 900,
    tooltip: {
      ...chartTheme.tooltip,
      formatter: (p: { name: string; data: [number, number] }) =>
        `<b>${p.name}</b><br/>${xLabel}: ${fmtCompact(p.data[0])}<br/>${yLabel}: ${fmtCompact(p.data[1])}`,
    },
    grid: { left: 52, right: 18, top: 20, bottom: 40 },
    xAxis: { ...axis, type: "value", name: xLabel, nameTextStyle: { color: "#7a8a99", fontSize: 10 } },
    yAxis: { ...axis, type: "value", name: yLabel, nameTextStyle: { color: "#7a8a99", fontSize: 10 }, axisLabel: { ...axis.axisLabel, formatter: (v: number) => fmtCompact(v) } },
    series: [
      {
        type: "scatter",
        symbolSize: 11,
        data: data.map((d) => ({ name: d.state, value: [d.x, d.y], itemStyle: { color: "rgba(0,245,212,0.75)", shadowBlur: 8, shadowColor: "rgba(0,245,212,0.4)" } })),
        label: {
          show: true,
          position: "top",
          color: "#7a8a99",
          fontSize: 9,
          fontFamily: "JetBrains Mono, monospace",
          formatter: (p: { name: string }) => p.name,
        },
        animationDelay: (i: number) => i * 20,
      },
    ],
  };
}

export function compareLines(
  rows: Array<{
    state: string;
    color: string;
    series: Array<{ year: number; value: number }>;
  }>,
): EChartsCoreOption {
  return {
    ...chartTheme,
    animationDuration: 800,
    animationEasing: "cubicOut",
    tooltip: { ...chartTheme.tooltip, trigger: "axis", valueFormatter: (v: unknown) => fmt(Number(v)) },
    legend: {
      top: 0,
      textStyle: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
    },
    grid: { left: 52, right: 18, top: 40, bottom: 30 },
    xAxis: {
      ...axis,
      type: "category",
      data: rows[0]?.series.map((p) => p.year) ?? [],
      boundaryGap: false,
    },
    yAxis: { ...axis, type: "value", axisLabel: { ...axis.axisLabel, formatter: (v: number) => fmtCompact(v) } },
    series: rows.map((r) => ({
      name: r.state,
      type: "line",
      smooth: 0.35,
      symbol: "circle",
      symbolSize: 5,
      showSymbol: false,
      data: r.series.map((p) => [p.year, p.value]),
      lineStyle: { width: 2.2, color: r.color, shadowColor: r.color, shadowBlur: 8 },
      itemStyle: { color: r.color },
      areaStyle: { color: r.color, opacity: 0.06 },
      animationDelay: (i: number) => i * 30,
    })),
  };
}

export function yearColumn(
  rows: Array<{ state: string; color: string; value: number }>,
): EChartsCoreOption {
  return {
    ...chartTheme,
    animationDuration: 800,
    animationEasing: "cubicOut",
    grid: { left: 52, right: 18, top: 24, bottom: 28 },
    tooltip: { ...chartTheme.tooltip, trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: unknown) => fmt(Number(v)) },
    xAxis: { ...axis, type: "category", data: rows.map((r) => r.state) },
    yAxis: { ...axis, type: "value", axisLabel: { ...axis.axisLabel, formatter: (v: number) => fmtCompact(v) } },
    series: [
      {
        type: "bar",
        barWidth: "46%",
        data: rows.map((r) => ({ value: r.value, itemStyle: { color: r.color, borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: "top", color: "#7a8a99", fontSize: 10, fontFamily: "JetBrains Mono, monospace", formatter: (p: { value: number }) => fmtCompact(p.value) },
        animationDelay: (i: number) => i * 60,
      },
    ],
  };
}

export function sankeyCrimeFlow(
  crimes: Array<{ key: string; label: string; color: string; total: number }>,
  states: Array<{ state: string; byCrime: Partial<Record<string, number>> }>,
  topStates = 10,
): EChartsCoreOption {
  const totalOf = (s: { byCrime: Partial<Record<string, number>> }) =>
    Object.values(s.byCrime).reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const ranked = [...states].sort((a, b) => totalOf(b) - totalOf(a));
  const chosen = ranked.slice(0, topStates);
  const nodes: Array<{ name: string; itemStyle?: { color: string } }> = crimes.map((c) => ({
    name: c.label,
    itemStyle: { color: c.color },
  }));
  for (const s of chosen) nodes.push({ name: s.state, itemStyle: { color: "rgba(139,92,246,0.85)" } });

  const links: Array<{ source: string; target: string; value: number }> = [];
  for (const c of crimes) {
    for (const s of chosen) {
      const v = s.byCrime[c.key as keyof typeof s.byCrime] ?? 0;
      if (v > 0) links.push({ source: c.label, target: s.state, value: v });
    }
  }

  return {
    ...chartTheme,
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: {
      ...chartTheme.tooltip,
      trigger: "item",
      formatter: (p: { dataType: string; data: { source?: string; target?: string; value?: number }; name?: string; value?: number }) => {
        if (p.dataType === "edge" && p.data) {
          return `${p.data.source} → ${p.data.target}<br/><span class="text-primary">${fmt(Number(p.data.value))} cases</span>`;
        }
        return `${p.name ?? ""}<br/><span>${fmt(Number(p.value ?? 0))} cases</span>`;
      },
    },
    series: [
      {
        type: "sankey",
        layout: "none",
        emphasis: { focus: "adjacency" },
        nodeAlign: "left",
        nodeWidth: 14,
        nodeGap: 10,
        draggable: true,
        data: nodes,
        links,
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.25 },
        label: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
      },
    ],
  };
}