import type { Row } from "@/lib/dataset-import";

export type MappingField = {
  field: string;
  target: string;
};

export type MappingSuggestion = MappingField & {
  column: string | null;
  score: number | null;
};

export const CLINICAL_FIELDS: MappingField[] = [
  { field: "Waist circumference", target: "waist_circ" },
  { field: "Triglycerides", target: "trig_mg_dl" },
  { field: "HDL Cholesterol", target: "hdl_chol" },
  { field: "Systolic BP", target: "bp_sys" },
  { field: "Diastolic BP", target: "bp_dia" },
  { field: "Fasting Glucose", target: "glucose_fasting" },
];

export const DIETARY_FIELDS: MappingField[] = [
  { field: "Age", target: "age_years" },
  { field: "Sex", target: "sex" },
  { field: "Dietary sodium", target: "diet_sodium_mg" },
  { field: "Dietary fibre", target: "fibre_g" },
  { field: "Added sugar", target: "added_sugar_g" },
  { field: "Saturated fat", target: "sat_fat_g" },
  { field: "Total energy", target: "kcal_total" },
];

/** Known aliases per analysis target (NHANES + eAsia naming). */
const TARGET_ALIASES: Record<string, string[]> = {
  waist_circ: [
    "waist_circ",
    "waist",
    "waist_cm",
    "waist circumference",
    "bmxwaist",
    "wc",
    "abdominal circumference",
  ],
  hdl_chol: ["hdl_chol", "hdl", "hdl_mg_dl", "lbdhdd", "lbdhdmsi", "hdl cholesterol"],
  bp_sys: ["bp_sys", "systolic", "systolic bp", "sbp", "avg_sys", "mean_sbp", "bpxsy1", "bpsys"],
  bp_dia: ["bp_dia", "diastolic", "diastolic bp", "dbp", "avg_dia", "mean_dbp", "bpxdi1", "bpdia"],
  glucose_fasting: [
    "glucose_fasting",
    "glu",
    "glucose",
    "lbxglu",
    "lbdglusi",
    "lbxglusi",
    "fpg",
    "fasting glucose",
    "fasting_glucose",
  ],
  trig_mg_dl: [
    "trig_mg_dl",
    "trig",
    "triglycerides",
    "lbxtr",
    "lbdtrsi",
    "tg",
    "serum_triglycerides",
  ],
  age_years: ["age_years", "age", "ridageyr", "age years"],
  sex: ["sex", "riagendr", "gender", "biological sex"],
  diet_sodium_mg: ["diet_sodium_mg", "sodium", "dr1isodi", "sodium_mg", "na_mg"],
  fibre_g: ["fibre_g", "fiber_g", "fibre", "fiber", "dr1ifibe"],
  added_sugar_g: ["added_sugar_g", "added sugar", "dr1isugr", "sugar_g", "sugars"],
  sat_fat_g: ["sat_fat_g", "dr1isfat", "saturated fat", "saturated_fat"],
  kcal_total: ["kcal_total", "dr1ikcal", "kcal", "energy", "calories", "energy_kcal"],
};

/**
 * NHANES canonical column name the backend ML pipeline expects for each
 * analysis target. The wizard's targets (e.g. "trig_mg_dl") are translated to
 * these before being sent to the run so the backend's canonical mapper honors
 * the user's confirmed mappings (see api/jobs/processor.apply_canonical_mapping).
 */
export const TARGET_TO_CANONICAL: Record<string, string> = {
  waist_circ: "BMXWAIST",
  trig_mg_dl: "LBXTR",
  hdl_chol: "LBDHDD",
  bp_sys: "BPXSY1",
  bp_dia: "BPXDI1",
  glucose_fasting: "LBXGLU",
  age_years: "RIDAGEYR",
  sex: "RIAGENDR",
  diet_sodium_mg: "DR1ISODI",
  fibre_g: "DR1IFIBE",
  added_sugar_g: "DR1ISUGR",
  sat_fat_g: "DR1ISFAT",
  kcal_total: "DR1IKCAL",
};

/**
 * Build a `{ rawColumn: canonicalName }` map from confirmed mapping suggestions,
 * suitable for the analysis run's `method_config.column_mapping`. Suggestions
 * without a selected column, or targets with no canonical, are skipped.
 */
export function buildColumnMapping(...groups: MappingSuggestion[][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of groups) {
    for (const s of group) {
      if (!s.column) continue;
      const canonical = TARGET_TO_CANONICAL[s.target];
      if (canonical) out[s.column] = canonical;
    }
  }
  return out;
}

function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Reject obvious NHANES / lab column name mismatches before scoring. */
function columnConflictsTarget(column: string, target: string): boolean {
  const c = compact(column);
  if (!c) return false;
  if (target === "trig_mg_dl") {
    return c.includes("glu") || c.includes("hdl") || c.includes("bp") || c.includes("waist");
  }
  if (target === "glucose_fasting") {
    return c.includes("trig") || c.includes("hdl") || (c.includes("bp") && !c.includes("glu"));
  }
  if (target === "hdl_chol") {
    return c.includes("glu") || c.includes("trig") || c.includes("bp");
  }
  if (target === "bp_sys" || target === "bp_dia") {
    return c.includes("glu") || c.includes("trig") || c.includes("hdl");
  }
  return false;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function fuzzyRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (!longer.length) return 1;
  if (!shorter.length) return 0;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i]!)) matches++;
  }
  return matches / longer.length;
}

function tokenOverlap(a: string, b: string): number {
  const t1 = new Set(tokenize(a));
  const t2 = new Set(tokenize(b));
  if (!t1.size || !t2.size) return 0;
  let inter = 0;
  for (const t of t1) if (t2.has(t)) inter++;
  return inter / Math.max(t1.size, t2.size);
}

function nameScore(column: string, target: string): number {
  const colCompact = compact(column);
  const aliases = TARGET_ALIASES[target] ?? [target];
  if (aliases.some((a) => compact(a) === colCompact)) return 1;
  if (compact(target) === colCompact) return 1;

  let bestFuzzy = 0;
  let bestToken = 0;
  for (const alias of aliases) {
    bestFuzzy = Math.max(bestFuzzy, fuzzyRatio(colCompact, compact(alias)));
    bestToken = Math.max(bestToken, tokenOverlap(column, alias));
  }
  return Math.min(1, 0.65 * bestFuzzy + 0.35 * bestToken);
}

function numericValues(rows: Row[], column: string): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const raw = row[column];
    if (raw == null || raw === "") continue;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function valueScore(column: string, target: string, rows: Row[]): number {
  const ns = nameScore(column, target);
  const vals = rows.map((r) => r[column]).filter((v) => v != null && v !== "");
  if (!vals.length) return 0.1;

  if (target === "sex") {
    if (ns < 0.35) return 0.05;
    const raw = vals.map((v) => String(v).trim().toLowerCase());
    const known = new Set(["1", "2", "m", "f", "male", "female", "man", "woman"]);
    const knownCount = raw.filter((v) => known.has(v)).length;
    const unique = new Set(raw).size;
    if (unique <= 5 && knownCount / raw.length >= 0.8 && unique >= 2) return 0.95;
    if (unique <= 5 && knownCount / raw.length >= 0.8) return 0.35;
    return 0.05;
  }

  const nums = numericValues(rows, column);
  const numericFrac = nums.length / vals.length;
  if (numericFrac < 0.7) return 0.1;

  const med = median(nums);
  if (med == null) return 0.1;

  if (target === "age_years") {
    if (ns < 0.35) return 0.15;
    if (med >= 0 && med <= 120) return 0.95;
    return 0.2;
  }

  if (
    target === "waist_circ" ||
    target === "bp_sys" ||
    target === "bp_dia" ||
    target === "trig_mg_dl" ||
    target === "hdl_chol" ||
    target === "glucose_fasting"
  ) {
    if (ns < 0.25) return 0.1;
  }

  if (target === "waist_circ") {
    if (med >= 40 && med <= 180) return 0.9;
    if (med >= 15 && med <= 80) return 0.75;
    return 0.25;
  }
  if (target === "bp_sys") return med >= 70 && med <= 220 ? 0.9 : 0.25;
  if (target === "bp_dia") return med >= 40 && med <= 140 ? 0.9 : 0.25;
  if (target === "trig_mg_dl") {
    if (med >= 20 && med <= 500) return 0.85;
    if (med >= 0.2 && med <= 10) return 0.75;
    return 0.25;
  }
  if (target === "hdl_chol") {
    if (med >= 10 && med <= 120) return 0.85;
    if (med >= 0.3 && med <= 4) return 0.75;
    return 0.25;
  }
  if (target === "glucose_fasting") {
    if (med >= 40 && med <= 300) return 0.85;
    if (med >= 2 && med <= 20) return 0.75;
    return 0.25;
  }

  if (numericFrac >= 0.8 && med >= 0 && ns >= 0.35) return 0.7;
  return 0.3;
}

function combinedScore(name: number, value: number, target: string): number {
  const base = name >= 0.9 ? 0.8 * name + 0.2 * value : 0.7 * name + 0.3 * value;
  const needsNumeric = !["sex"].includes(target);
  if (needsNumeric && value <= 0.15 && name < 0.9) return base * 0.5;
  return Math.min(1, Math.max(0, base));
}

export function emptyMappings(fields: MappingField[]): MappingSuggestion[] {
  return fields.map((f) => ({ ...f, column: null, score: null }));
}

function scoreColumnForTarget(column: string, target: string, rows: Row[]) {
  if (columnConflictsTarget(column, target)) return 0;
  const ns = nameScore(column, target);
  const vs = valueScore(column, target, rows);
  return combinedScore(ns, vs, target);
}

/** Greedy assignment so one column is not mapped to multiple fields. */
function assignFields(
  fields: MappingField[],
  columns: string[],
  rows: Row[],
  usedColumns: Set<string> = new Set(),
  minScore = 0.55,
): { mappings: MappingSuggestion[]; usedColumns: Set<string> } {
  type Candidate = { target: string; column: string; score: number; field: string };
  const candidates: Candidate[] = [];

  for (const { field, target } of fields) {
    for (const column of columns) {
      if (usedColumns.has(column)) continue;
      const score = scoreColumnForTarget(column, target, rows);
      if (score < minScore) continue;
      candidates.push({ field, target, column, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const nextUsed = new Set(usedColumns);
  const assigned = new Map<string, { column: string; score: number }>();

  for (const c of candidates) {
    if (assigned.has(c.target) || nextUsed.has(c.column)) continue;
    assigned.set(c.target, { column: c.column, score: c.score });
    nextUsed.add(c.column);
  }

  const mappings = fields.map(({ field, target }) => {
    const hit = assigned.get(target);
    return {
      field,
      target,
      column: hit?.column ?? null,
      score: hit?.score ?? null,
    };
  });

  return { mappings, usedColumns: nextUsed };
}

export function autoMapAnalysisFields(
  columns: string[],
  rows: Row[],
): { clinical: MappingSuggestion[]; dietary: MappingSuggestion[] } {
  const clinicalResult = assignFields(CLINICAL_FIELDS, columns, rows, new Set(), 0.5);
  const dietaryResult = assignFields(
    DIETARY_FIELDS,
    columns,
    rows,
    clinicalResult.usedColumns,
    0.65,
  );
  return {
    clinical: clinicalResult.mappings,
    dietary: dietaryResult.mappings,
  };
}
