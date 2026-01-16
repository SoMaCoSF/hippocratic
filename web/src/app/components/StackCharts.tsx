// ==============================================================================
// file_id: SOM-SCR-0023-v0.1.0
// name: StackCharts.tsx
// description: ECharts visualizations for stacked-address analytics (histogram, top stacks, scatter)
// project_id: HIPPOCRATIC
// category: script
// tags: [web, echarts, visualization, fraud, stacking]
// created: 2026-01-16
// modified: 2026-01-16
// version: 0.1.0
// agent_id: AGENT-CURSOR-OPENAI
// execution: Imported by /stacked page (client component)
// ==============================================================================

"use client";

import ReactECharts from "echarts-for-react";
import type { StackGroup } from "@/lib/stacking";

type EChartsClickParam = {
  dataIndex?: unknown;
  value?: unknown;
};

type EChartsTooltipParam = {
  value?: unknown;
};

function asScatterValue(v: unknown): [number, number, string, string] | null {
  if (!Array.isArray(v) || v.length < 4) return null;
  const [a, b, c, d] = v;
  if (typeof a !== "number" || typeof b !== "number") return null;
  if (typeof c !== "string" || typeof d !== "string") return null;
  return [a, b, c, d];
}

function buildHistogram(groups: StackGroup[]) {
  // bucket sizes: 2,3,4,5,6-9,10-19,20+
  const buckets = [
    { label: "2", min: 2, max: 2 },
    { label: "3", min: 3, max: 3 },
    { label: "4", min: 4, max: 4 },
    { label: "5", min: 5, max: 5 },
    { label: "6–9", min: 6, max: 9 },
    { label: "10–19", min: 10, max: 19 },
    { label: "20+", min: 20, max: 10_000 },
  ];
  const counts = buckets.map((b) =>
    groups.filter((g) => g.total >= b.min && g.total <= b.max).length,
  );
  return { buckets, counts };
}

export function StackCharts({
  groups,
  onPickStackKey,
}: {
  groups: StackGroup[];
  onPickStackKey: (key: string) => void;
}) {
  const stacked = groups.filter((g) => g.total >= 2);
  const hist = buildHistogram(stacked);

  const top = stacked.slice(0, 30);
  const topLabels = top.map((g) =>
    g.addressLabel.length > 38 ? g.addressLabel.slice(0, 38) + "…" : g.addressLabel,
  );
  const topValues = top.map((g) => g.total);

  const scatterData = stacked
    .slice(0, 2000)
    .map((g) => [g.distinctCategories, g.total, g.key, g.addressLabel]);

  const common = {
    textStyle: { fontFamily: "var(--font-geist-sans)" },
    backgroundColor: "transparent",
  } as const;

  const histOption = {
    ...common,
    title: { text: "Stack size distribution (addresses with ≥2 facilities)", left: "center" },
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 60, bottom: 40 },
    xAxis: { type: "category", data: hist.buckets.map((b) => b.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: hist.counts,
        itemStyle: { color: "#3b82f6" },
      },
    ],
  };

  const topOption = {
    ...common,
    title: { text: "Top stacked addresses (click bar to open)", left: "center" },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 10, right: 20, top: 60, bottom: 120, containLabel: true },
    xAxis: {
      type: "category",
      data: topLabels,
      axisLabel: { rotate: 50, interval: 0 },
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: topValues,
        itemStyle: { color: "#f59e0b" },
      },
    ],
  };

  const scatterOption = {
    ...common,
    title: { text: "Suspicion map: category diversity vs stack size", left: "center" },
    tooltip: {
      formatter: (p: EChartsTooltipParam) => {
        const v = asScatterValue(p.value);
        if (!v) return "";
        return `<div style="max-width:360px"><b>${v[3]}</b><br/>distinct categories: ${v[0]}<br/>stack size: ${v[1]}</div>`;
      },
    },
    grid: { left: 50, right: 20, top: 60, bottom: 50 },
    xAxis: { type: "value", name: "distinct categories", minInterval: 1 },
    yAxis: { type: "value", name: "stack size", min: 2 },
    series: [
      {
        type: "scatter",
        data: scatterData,
        symbolSize: (val: unknown) => {
          const v = asScatterValue(val);
          const size = v ? v[1] : 2;
          return Math.min(22, 6 + size * 0.7);
        },
        itemStyle: { color: "#10b981" },
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <ReactECharts option={histOption} style={{ height: 260 }} />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
        <ReactECharts
          option={topOption}
          style={{ height: 320 }}
          onEvents={{
            click: (p: EChartsClickParam) => {
              const idx = typeof p.dataIndex === "number" ? p.dataIndex : -1;
              if (idx >= 0 && top[idx]) onPickStackKey(top[idx].key);
            },
          }}
        />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-3">
        <ReactECharts
          option={scatterOption}
          style={{ height: 360 }}
          onEvents={{
            click: (p: EChartsClickParam) => {
              const v = asScatterValue(p.value);
              if (v?.[2]) onPickStackKey(v[2]);
            },
          }}
        />
      </div>
    </div>
  );
}


