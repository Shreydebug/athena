"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  SankeyChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent,
  MarkLineComponent,
  MarkPointComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  SankeyChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent,
  MarkLineComponent,
  MarkPointComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const TOOLTIP_BASE = {
  backgroundColor: "rgba(8,11,15,0.95)",
  borderColor: "rgba(0,245,212,0.35)",
  borderWidth: 1,
  padding: [10, 12],
  textStyle: {
    color: "#dbe7ee",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12,
  },
  extraCssText: "box-shadow: 0 0 24px rgba(0,245,212,0.15); border-radius: 8px;",
};

export const chartTheme = {
  tooltip: TOOLTIP_BASE,
  textStyle: { fontFamily: "JetBrains Mono, monospace", color: "#9fb0bd" },
  axisPointer: {
    lineStyle: { color: "rgba(0,245,212,0.4)" },
    label: { color: "#050608", backgroundColor: "#00F5D4" },
  },
};

export const axis = {
  axisLine: { lineStyle: { color: "rgba(0,245,212,0.2)" } },
  axisTick: { lineStyle: { color: "rgba(0,245,212,0.25)" } },
  axisLabel: { color: "#7a8a99", fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
  splitLine: { lineStyle: { color: "rgba(0,245,212,0.06)" } },
};

export default function EChart({
  option,
  height = 300,
  className = "",
}: {
  option: EChartsCoreOption;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={ref} className={className} style={{ height, width: "100%" }} />;
}