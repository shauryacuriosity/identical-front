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

// ─── ID detection + smart defaults ───────────────────────────────────────
// An ID column is detected by (a) name patterns common to public-health
// datasets (SEQN, *_id, *Id) or (b) every non-empty value being a unique
// integer — i.e. a primary key.

const ID_NAME = /^(seqn|id)$/i;
const ID_SUFFIX = /(_id|Id)$/;

export function isIdColumn(rows: Row[], col: string): boolean {
  if (ID_NAME.test(col) || ID_SUFFIX.test(col)) return true;
  if (rows.length < 8) return false;
  // Every non-empty value distinct and integral?
  const seen = new Set<unknown>();
  let nonEmpty = 0;
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === "") continue;
    nonEmpty++;
    const n = toNum(v);
    if (n === null || !Number.isInteger(n)) return false;
    if (seen.has(n)) return false;
    seen.add(n);
  }
  // Need a decent sample of all-unique integers before calling it an ID.
  return nonEmpty >= Math.min(rows.length, 50) && seen.size === nonEmpty;
}

export function nonIdNumericColumns(rows: Row[], columns: string[]): string[] {
  return columns.filter((c) => isNumericColumn(rows, c) && !isIdColumn(rows, c));
}

/** Cardinality of a column, capped early for large datasets. */
function distinctCount(rows: Row[], col: string, cap = 100): number {
  const seen = new Set<unknown>();
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === "") continue;
    seen.add(v);
    if (seen.size > cap) return cap + 1;
  }
  return seen.size;
}

/**
 * Columns that look like categories — either string-typed or low-cardinality
 * integer-coded indicators (e.g. NHANES BMDSTATS/BMIWT). Excludes ID columns.
 * Requires reasonable non-null coverage so we don't pick "indicator" columns
 * that are 95 % missing on public health datasets.
 */
export function categoricalCandidates(rows: Row[], columns: string[]): string[] {
  const out: { col: string; n: number; cov: number; balance: number }[] = [];
  const total = rows.length;
  for (const c of columns) {
    if (isIdColumn(rows, c)) continue;
    const counts = new Map<unknown, number>();
    let nonEmpty = 0;
    for (const r of rows) {
      const v = r[c];
      if (v === null || v === undefined || v === "") continue;
      nonEmpty++;
      counts.set(v, (counts.get(v) ?? 0) + 1);
      if (counts.size > 31) break;
    }
    if (counts.size < 2 || counts.size > 30) continue;
    const cov = total === 0 ? 0 : nonEmpty / total;
    if (cov < 0.3) continue;
    // Reject "dominated" columns where >85 % of non-empty rows share one
    // value (e.g. NHANES BMDSTATS, RIDEXMON status flags) — they render as
    // a single tall bar and one toothpick.
    let topShare = 0;
    for (const n of counts.values()) {
      const share = n / nonEmpty;
      if (share > topShare) topShare = share;
    }
    if (topShare > 0.85) continue;
    out.push({ col: c, n: counts.size, cov, balance: 1 - topShare });
  }
  // Prefer well-balanced, well-covered columns first.
  out.sort((a, b) => b.balance - a.balance || b.cov - a.cov || a.n - b.n);
  return out.map((x) => x.col);
}

/**
 * Numeric non-ID columns ranked for "smart default" picking. Skips:
 *  - near-constant columns (distinct < 5) — they're really indicators,
 *    not continuous measurements;
 *  - dominated columns where one value covers > 85 % of rows (e.g. NHANES
 *    BMDSTATS where ~95 % of rows are 1.0);
 *  - sparse columns where < 20 % of rows have a value.
 * The rest are ranked by coverage, then by variation (distinct count).
 */
function rankedNumericForDefaults(rows: Row[], columns: string[]): string[] {
  const total = rows.length;
  const out: { col: string; distinct: number; cov: number }[] = [];
  for (const c of columns) {
    if (!isNumericColumn(rows, c) || isIdColumn(rows, c)) continue;
    const counts = new Map<unknown, number>();
    let nonEmpty = 0;
    for (const r of rows) {
      const v = r[c];
      if (v === null || v === undefined || v === "") continue;
      nonEmpty++;
      counts.set(v, (counts.get(v) ?? 0) + 1);
      if (counts.size > 50) break;
    }
    if (counts.size < 5) continue;
    const cov = total === 0 ? 0 : nonEmpty / total;
    if (cov < 0.2) continue;
    let topShare = 0;
    for (const n of counts.values()) {
      const share = n / nonEmpty;
      if (share > topShare) topShare = share;
    }
    if (topShare > 0.85) continue;
    out.push({ col: c, distinct: counts.size, cov });
  }
  // Higher coverage first, then higher cardinality (more interesting distribution).
  out.sort((a, b) => b.cov - a.cov || b.distinct - a.distinct);
  return out.map((x) => x.col);
}

/**
 * Pick chart-type-appropriate defaults given the current rows + columns.
 * Returns the slots that need to change; callers should overlay this onto
 * the existing config. Missing/empty fields mean "leave as-is".
 */
export function pickSmartDefaults(
  rows: Row[],
  columns: string[],
  chartType: ChartType,
): { x?: string; y?: string; agg?: Agg; bins?: number; topN?: number } {
  if (!columns.length) return {};
  const ranked = rankedNumericForDefaults(rows, columns);
  const cats = categoricalCandidates(rows, columns);
  // Prefer good cats; otherwise fall back to ranked numerics (which will
  // auto-bin for bar) or any non-ID column.
  const firstCat = cats[0];
  const fallbackX = ranked[0] ?? columns.find((c) => !isIdColumn(rows, c)) ?? columns[0];

  switch (chartType) {
    case "bar":
      return {
        x: firstCat ?? fallbackX,
        y: "__count__",
        agg: "count",
        topN: 0,
      };
    case "line":
    case "area":
      return {
        x: ranked[0] ?? firstCat ?? fallbackX,
        y: ranked[1] ?? ranked[0] ?? "__count__",
        agg: "avg",
      };
    case "scatter":
      return {
        x: ranked[0] ?? fallbackX,
        y: ranked[1] ?? ranked[0] ?? fallbackX,
      };
    case "histogram":
      return {
        x: ranked[0] ?? fallbackX,
        bins: 20,
      };
    case "box":
      return {
        x: firstCat ?? fallbackX,
        y: ranked[0] ?? fallbackX,
      };
    case "heatmap":
      return {};
    case "kpi":
      return {
        y: ranked[0] ?? "__count__",
        agg: "avg",
      };
  }
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
    const nums = nonIdNumericColumns(rows, columns);
    if (nums.length < 2) {
      return { ...empty, error: "Need at least two numeric non-ID columns for a correlation heatmap." };
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
    let min = Infinity;
    let max = -Infinity;
    for (const v of vals) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
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

  // Auto-bin a high-cardinality numeric X for bar/line/area so we never end
  // up with thousands of 1-tall bars (or a 8 000-point sawtooth line) on
  // continuous columns like weight, BMI, or age.
  const shouldAutoBin =
    (chartType === "bar" || chartType === "line" || chartType === "area") &&
    xIsNumeric &&
    distinctCount(rows, config.x, 31) > 30;
  let binnedX: Map<unknown, string> | null = null;
  if (shouldAutoBin) {
    const xs: number[] = [];
    for (const r of rows) {
      const n = toNum(r[config.x]);
      if (n !== null) xs.push(n);
    }
    if (xs.length) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of xs) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const B = 12;
      const w = (hi - lo) / B || 1;
      binnedX = new Map();
      for (const r of rows) {
        const v = r[config.x];
        const n = toNum(v);
        if (n === null) {
          binnedX.set(v, "—");
          continue;
        }
        let i = Math.floor((n - lo) / w);
        if (i >= B) i = B - 1;
        if (i < 0) i = 0;
        const lbl = `${round(lo + i * w)}–${round(lo + (i + 1) * w)}`;
        binnedX.set(v, lbl);
      }
    }
  }
  const xKeyOf = (r: Row): string =>
    binnedX ? (binnedX.get(r[config.x]) ?? "—") : String(r[config.x] ?? "");

  // With a series field, pivot into wide format.
  if (config.series) {
    const seriesKeys = Array.from(new Set(rows.map((r) => String(r[config.series!] ?? ""))));
    const groups = new Map<string, Record<string, number[]>>();
    for (const r of rows) {
      const xk = xKeyOf(r);
      if (chartType === "bar" && (xk === "" || xk === "—")) continue;
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
    if (xIsNumeric && !binnedX) {
      data.sort((a, b) => Number(a[config.x!]) - Number(b[config.x!]));
    } else if (binnedX) {
      data.sort((a, b) => {
        const al = Number(String(a[config.x!]).split("–")[0]);
        const bl = Number(String(b[config.x!]).split("–")[0]);
        return al - bl;
      });
    }
    if (chartType === "bar" && config.topN && config.topN > 0 && !binnedX) {
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
    const xk = xKeyOf(r);
    // For bar charts, drop rows with empty X — they dominate the chart with
    // an "" or "—" bucket on datasets with sparse indicator columns.
    if (chartType === "bar" && (xk === "" || xk === "—")) continue;
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
  if (xIsNumeric && !binnedX) {
    data.sort((a, b) => Number(a[config.x!]) - Number(b[config.x!]));
  } else if (binnedX) {
    data.sort((a, b) => {
      const al = Number(String(a[config.x!]).split("–")[0]);
      const bl = Number(String(b[config.x!]).split("–")[0]);
      return al - bl;
    });
  }
  if (chartType === "bar" && config.topN && config.topN > 0 && !binnedX) {
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
