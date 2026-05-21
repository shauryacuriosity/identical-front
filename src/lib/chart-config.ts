import type { Row } from "@/lib/dataset-import";

export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "scatter"
  | "histogram"
  | "box"
  | "heatmap"
  | "kpi";

export type Agg = "sum" | "avg" | "min" | "max" | "count" | "median";

export type ChartConfig = {
  id: string;
  chartType: ChartType;
  x?: string;
  y?: string; // column name; ignored for histogram/heatmap
  series?: string;
  agg?: Agg;
  bins?: number;
  topN?: number;
};

export type BuiltChart = {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKeys: string[];
  /** For KPI charts only. */
  kpiValue?: number | null;
  /** For heatmap only. */
  heatmapColumns?: string[];
  error?: string;
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function isNumericColumn(rows: Row[], col: string): boolean {
  if (!rows.length) return false;
  let total = 0;
  let numeric = 0;
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === "") continue;
    total++;
    if (toNum(v) !== null) numeric++;
  }
  if (total === 0) return false;
  return numeric / total >= 0.8;
}

export function numericColumns(rows: Row[], columns: string[]): string[] {
  return columns.filter((c) => isNumericColumn(rows, c));
}

function aggregate(values: number[], agg: Agg): number {
  if (agg === "count") return values.length;
  if (values.length === 0) return 0;
  if (agg === "sum") return values.reduce((a, b) => a + b, 0);
  if (agg === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (agg === "min") return Math.min(...values);
  if (agg === "max") return Math.max(...values);
  if (agg === "median") {
    const s = [...values].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  return 0;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  let sx = 0,
    sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0) return 0;
  return num / den;
}

export function buildChartData(
  rows: Row[],
  columns: string[],
  config: ChartConfig,
): BuiltChart {
  const empty: BuiltChart = { data: [], xKey: "", yKeys: [] };
  if (!rows.length || !columns.length) {
    return { ...empty, error: "No data — select attributes in Datasets first." };
  }

  const { chartType } = config;

  // -- HEATMAP (correlation across numeric columns) --
  if (chartType === "heatmap") {
    const nums = numericColumns(rows, columns);
    if (nums.length < 2) {
      return { ...empty, error: "Need at least two numeric columns for a correlation heatmap." };
    }
    const series: Record<string, number[]> = {};
    for (const c of nums) series[c] = rows.map((r) => toNum(r[c])).filter((n): n is number => n !== null);
    const data: Array<Record<string, unknown>> = [];
    for (const yc of nums) {
      const row: Record<string, unknown> = { __row: yc };
      for (const xc of nums) row[xc] = round(pearson(series[yc], series[xc]));
      data.push(row);
    }
    return { data, xKey: "__row", yKeys: nums, heatmapColumns: nums };
  }

  // -- HISTOGRAM --
  if (chartType === "histogram") {
    if (!config.x) return { ...empty, error: "Pick an X axis column." };
    if (!isNumericColumn(rows, config.x))
      return { ...empty, error: `"${config.x}" is not numeric — histograms need a numeric column.` };
    const vals = rows.map((r) => toNum(r[config.x!])).filter((n): n is number => n !== null);
    if (!vals.length) return { ...empty, error: "No numeric values to bin." };
    const bins = Math.max(2, Math.min(60, config.bins ?? 12));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const width = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    for (const v of vals) {
      let i = Math.floor((v - min) / width);
      if (i >= bins) i = bins - 1;
      if (i < 0) i = 0;
      counts[i]++;
    }
    const data = counts.map((c, i) => ({
      bin: `${round(min + i * width)}`,
      count: c,
    }));
    return { data, xKey: "bin", yKeys: ["count"] };
  }

  // -- KPI --
  if (chartType === "kpi") {
    if (!config.y) return { ...empty, error: "Pick a Y column to summarise." };
    const agg = config.agg ?? "avg";
    if (agg === "count") {
      return { ...empty, kpiValue: rows.length };
    }
    if (!isNumericColumn(rows, config.y))
      return { ...empty, error: `"${config.y}" is not numeric — pick "count" or a numeric column.` };
    const vals = rows.map((r) => toNum(r[config.y!])).filter((n): n is number => n !== null);
    return { ...empty, kpiValue: vals.length ? round(aggregate(vals, agg)) : null };
  }

  // -- BOX --
  if (chartType === "box") {
    if (!config.x || !config.y)
      return { ...empty, error: "Pick X (category) and Y (numeric) columns." };
    if (!isNumericColumn(rows, config.y))
      return { ...empty, error: `Y "${config.y}" must be numeric for a box plot.` };
    const groups = new Map<string, number[]>();
    for (const r of rows) {
      const k = String(r[config.x] ?? "");
      const n = toNum(r[config.y]);
      if (n === null) continue;
      const arr = groups.get(k);
      if (arr) arr.push(n);
      else groups.set(k, [n]);
    }
    const data: Array<Record<string, unknown>> = [];
    for (const [k, vals] of groups) {
      const s = [...vals].sort((a, b) => a - b);
      const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
      data.push({
        [config.x]: k,
        min: round(s[0] ?? 0),
        q1: round(q(0.25)),
        median: round(q(0.5)),
        q3: round(q(0.75)),
        max: round(s[s.length - 1] ?? 0),
      });
    }
    return { data, xKey: config.x, yKeys: ["min", "q1", "median", "q3", "max"] };
  }

  // -- SCATTER --
  if (chartType === "scatter") {
    if (!config.x || !config.y)
      return { ...empty, error: "Pick X and Y columns." };
    if (!isNumericColumn(rows, config.x) || !isNumericColumn(rows, config.y))
      return { ...empty, error: "Scatter requires numeric X and Y." };
    if (config.series) {
      // Recharts handles series via multiple <Scatter> elements; we return one dataset per series under series key
      const data = rows
        .map((r) => ({
          [config.x!]: toNum(r[config.x!]),
          [config.y!]: toNum(r[config.y!]),
          __series: String(r[config.series!] ?? ""),
        }))
        .filter((d) => d[config.x!] !== null && d[config.y!] !== null);
      const yKeys = Array.from(new Set(data.map((d) => d.__series)));
      return { data, xKey: config.x, yKeys };
    }
    const data = rows
      .map((r) => ({
        [config.x!]: toNum(r[config.x!]),
        [config.y!]: toNum(r[config.y!]),
      }))
      .filter((d) => d[config.x!] !== null && d[config.y!] !== null);
    return { data, xKey: config.x, yKeys: [config.y] };
  }

  // -- BAR / LINE / AREA --
  if (!config.x) return { ...empty, error: "Pick an X axis column." };
  const yCol = config.y && config.y !== "__count__" ? config.y : null;
  const useCount = !yCol;
  if (yCol && !isNumericColumn(rows, yCol))
    return { ...empty, error: `Y "${yCol}" must be numeric (or pick count).` };

  const xIsNumeric = isNumericColumn(rows, config.x);
  const agg = config.agg ?? (useCount ? "count" : "sum");

  // With a series field, pivot into wide format.
  if (config.series) {
    const seriesKeys = Array.from(new Set(rows.map((r) => String(r[config.series!] ?? ""))));
    const groups = new Map<string, Record<string, number[]>>();
    for (const r of rows) {
      const xk = String(r[config.x] ?? "");
      const sk = String(r[config.series] ?? "");
      let g = groups.get(xk);
      if (!g) {
        g = {};
        for (const s of seriesKeys) g[s] = [];
        groups.set(xk, g);
      }
      if (useCount) g[sk].push(1);
      else {
        const n = toNum(r[yCol!]);
        if (n !== null) g[sk].push(n);
      }
    }
    let data: Array<Record<string, unknown>> = [];
    for (const [xk, g] of groups) {
      const row: Record<string, unknown> = { [config.x]: xk };
      for (const s of seriesKeys) row[s] = round(aggregate(g[s], agg));
      data.push(row);
    }
    if (xIsNumeric) data.sort((a, b) => Number(a[config.x!]) - Number(b[config.x!]));
    if (chartType === "bar" && config.topN && config.topN > 0) {
      const totals = data.map((d) => ({
        d,
        total: seriesKeys.reduce((s, k) => s + Number(d[k] ?? 0), 0),
      }));
      totals.sort((a, b) => b.total - a.total);
      data = totals.slice(0, config.topN).map((t) => t.d);
    }
    return { data, xKey: config.x, yKeys: seriesKeys };
  }

  // No series: simple X → aggregated Y
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const xk = String(r[config.x] ?? "");
    const arr = groups.get(xk) ?? [];
    if (useCount) arr.push(1);
    else {
      const n = toNum(r[yCol!]);
      if (n !== null) arr.push(n);
    }
    groups.set(xk, arr);
  }
  const yKey = useCount ? "count" : `${yCol}_${agg}`;
  let data: Array<Record<string, unknown>> = [];
  for (const [xk, vals] of groups) {
    data.push({ [config.x]: xk, [yKey]: round(aggregate(vals, agg)) });
  }
  if (xIsNumeric) data.sort((a, b) => Number(a[config.x!]) - Number(b[config.x!]));
  if (chartType === "bar" && config.topN && config.topN > 0) {
    data = [...data].sort((a, b) => Number(b[yKey]) - Number(a[yKey])).slice(0, config.topN);
  }
  return { data, xKey: config.x, yKeys: [yKey] };
}

export function toCSV(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const cols = Array.from(
    rows.reduce<Set<string>>((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set()),
  );
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${head}\n${body}`;
}
