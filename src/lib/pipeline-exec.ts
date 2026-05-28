import type { Row } from "@/lib/dataset-import";

export type StepKind = "from" | "join" | "aggregate" | "filter" | "sort";
export type Step = {
  id: string;
  kind: StepKind;
  parts: { label: string; value: string; mono?: boolean }[];
};

export type RunResult = {
  columns: string[];
  rows: Row[];
  totalRows: number;
  truncated: boolean;
  notes: string[];
};

function partVal(step: Step, label: string): string | undefined {
  return step.parts.find((p) => p.label === label)?.value;
}

function stem(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function cmp(a: unknown, b: unknown): number {
  const na = toNum(a);
  const nb = toNum(b);
  if (na !== null && nb !== null) return na - nb;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function joinRows(
  left: Row[],
  right: Row[],
  onKey: string,
  kind: string,
  rightPrefix: string,
  notes: string[],
): Row[] {
  if (kind === "Cross Join") {
    const out: Row[] = [];
    for (const l of left)
      for (const r of right) out.push({ ...l, ...prefixCollisions(l, r, rightPrefix) });
    return out;
  }
  const index = new Map<string, Row[]>();
  for (const r of right) {
    const k = String(r[onKey] ?? "");
    const arr = index.get(k);
    if (arr) arr.push(r);
    else index.set(k, [r]);
  }
  const out: Row[] = [];
  const matchedRight = new Set<Row>();
  for (const l of left) {
    const k = String(l[onKey] ?? "");
    const matches = index.get(k);
    if (matches && matches.length) {
      for (const r of matches) {
        out.push({ ...l, ...prefixCollisions(l, r, rightPrefix) });
        matchedRight.add(r);
      }
    } else if (kind === "Left Join" || kind === "Outer Join") {
      out.push({ ...l });
    }
  }
  if (kind === "Right Join" || kind === "Outer Join") {
    for (const r of right) {
      if (!matchedRight.has(r)) {
        out.push({ ...prefixCollisions({}, r, rightPrefix) });
      }
    }
  }
  if (out.length === 0) notes.push(`${kind} on "${onKey}" produced 0 rows`);
  return out;
}

function prefixCollisions(l: Row, r: Row, prefix: string): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) {
    if (k in l) out[`${prefix}.${k}`] = v;
    else out[k] = v;
  }
  return out;
}

function aggregate(rows: Row[], col: string, by: string, groupCols: string[]): Row[] {
  const groups = new Map<string, { key: Row; vals: number[]; raw: unknown[] }>();
  for (const r of rows) {
    const key: Row = {};
    for (const g of groupCols) key[g] = r[g];
    const k = JSON.stringify(key);
    let g = groups.get(k);
    if (!g) {
      g = { key, vals: [], raw: [] };
      groups.set(k, g);
    }
    const n = toNum(r[col]);
    if (n !== null) g.vals.push(n);
    g.raw.push(r[col]);
  }
  const out: Row[] = [];
  for (const g of groups.values()) {
    const v = computeAgg(g.vals, g.raw, by);
    out.push({ ...g.key, [`${col}_${by.toLowerCase().replace(/[^a-z]/g, "")}`]: v });
  }
  return out;
}

function computeAgg(vals: number[], raw: unknown[], by: string): number | string {
  if (by === "Count") return raw.length;
  if (vals.length === 0) return "";
  if (by === "Sum") return vals.reduce((a, b) => a + b, 0);
  if (by === "Mean") return round(vals.reduce((a, b) => a + b, 0) / vals.length);
  if (by === "Median") {
    const s = [...vals].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : round((s[m - 1] + s[m]) / 2);
  }
  if (by === "Min / Max") return `${Math.min(...vals)} / ${Math.max(...vals)}`;
  return "";
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function applyFilter(rows: Row[], col: string, op: string, val: string): Row[] {
  return rows.filter((r) => {
    const cell = r[col];
    switch (op) {
      case "Equals":
        return String(cell) === val;
      case "Contains":
        return String(cell).toLowerCase().includes(val.toLowerCase());
      case "Greater than": {
        const n = toNum(cell);
        const v = toNum(val);
        return n !== null && v !== null && n > v;
      }
      case "Less than": {
        const n = toNum(cell);
        const v = toNum(val);
        return n !== null && v !== null && n < v;
      }
      case "Between": {
        const n = toNum(cell);
        const [a, b] = val.split("..").map((s) => toNum(s.trim()));
        return n !== null && a !== null && b !== null && n >= a && n <= b;
      }
      default:
        return true;
    }
  });
}

function applySort(rows: Row[], col: string, kind: string): Row[] {
  const sorted = [...rows];
  if (kind === "Ascending") sorted.sort((a, b) => cmp(a[col], b[col]));
  else if (kind === "Descending") sorted.sort((a, b) => cmp(b[col], a[col]));
  else if (kind === "Alphabetical")
    sorted.sort((a, b) => String(a[col] ?? "").localeCompare(String(b[col] ?? "")));
  else if (kind === "Reverse Alpha")
    sorted.sort((a, b) => String(b[col] ?? "").localeCompare(String(a[col] ?? "")));
  return sorted;
}

const PREVIEW_LIMIT = 200;

export function runPipeline(
  steps: Step[],
  tables: Record<string, Row[]>,
  selectedCols?: string[],
  opts?: { limit?: number },
): RunResult {
  const notes: string[] = [];
  let rows: Row[] = [];

  for (const step of steps) {
    if (step.kind === "from") {
      const name = partVal(step, "FROM");
      if (!name) continue;
      const src = tables[name];
      if (!src || src.length === 0) {
        notes.push(`No row data available for ${name}`);
        rows = [];
      } else {
        rows = src.map((r) => ({ ...r }));
      }
    } else if (step.kind === "join") {
      const right = partVal(step, "JOIN");
      const on = partVal(step, "ON") ?? "";
      const using = partVal(step, "USING") ?? "Inner Join";
      if (!right) continue;
      const rsrc = tables[right];
      if (!rsrc) {
        notes.push(`No row data for ${right}`);
        continue;
      }
      rows = joinRows(rows, rsrc, on, using, stem(right), notes);
    } else if (step.kind === "aggregate") {
      const col = partVal(step, "AGGREGATE") ?? "";
      const by = partVal(step, "BY") ?? "Sum";
      const allKeys = rows[0] ? Object.keys(rows[0]) : [];
      const groupCols = allKeys.filter((k) => {
        if (k === col) return false;
        if (selectedCols && !selectedCols.includes(k)) return false;
        const v = rows[0]?.[k];
        return toNum(v) === null;
      });
      rows = aggregate(rows, col, by, groupCols);
    } else if (step.kind === "filter") {
      const col = partVal(step, "FILTER") ?? "";
      const op = step.parts[1]?.label ?? "Equals";
      const val = step.parts[1]?.value ?? "";
      rows = applyFilter(rows, col, op, val);
    } else if (step.kind === "sort") {
      const col = partVal(step, "SORT") ?? "";
      const kind = step.parts[1]?.value ?? "Ascending";
      rows = applySort(rows, col, kind);
    }
  }

  const allColumns = rows[0] ? Object.keys(rows[0]) : [];
  let columns = allColumns;
  if (selectedCols && selectedCols.length) {
    const filtered = allColumns.filter((c) => selectedCols.includes(c));
    const extras = allColumns.filter(
      (c) => !selectedCols.includes(c) && /_(sum|mean|median|count|minmax)$/.test(c),
    );
    columns = [...filtered, ...extras];
    if (columns.length === 0) columns = allColumns;
  }

  const limit = opts?.limit ?? PREVIEW_LIMIT;
  const totalRows = rows.length;
  const truncated = totalRows > limit;
  const outRows = (truncated ? rows.slice(0, limit) : rows).map((r) => {
    const o: Row = {};
    for (const c of columns) o[c] = r[c];
    return o;
  });

  return { columns, rows: outRows, totalRows, truncated, notes };
}
