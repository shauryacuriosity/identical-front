import type { Row } from "@/lib/dataset-import";
import type { MappingSuggestion } from "@/lib/column-mapping";

export type SexFilter = "All" | "Female" | "Male";

export type CohortFilters = {
  ageMin: number;
  ageMax: number;
  sex: SexFilter;
};

export type CohortResult = {
  /** Estimated participants kept, scaled from the sample to the full dataset. */
  included: number;
  pct: number;
  sampleSize: number;
  sampleIncluded: number;
  /** Whether the dataset actually has the column needed for each filter. */
  canFilterAge: boolean;
  canFilterSex: boolean;
  /** False for fake/empty datasets with no usable numeric participant data. */
  analyzable: boolean;
  /** True when `included` is estimated from a truncated preview sample. */
  sampled: boolean;
  /** Real MetS prevalence in the sample when a label column exists, else null. */
  prevalence: number | null;
};

export function normalizeSexValue(v: unknown): SexFilter | null {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (s === "1" || s === "m" || s === "male" || s === "man") return "Male";
  if (s === "2" || s === "f" || s === "female" || s === "woman") return "Female";
  return null;
}

function findMappedColumn(mappings: MappingSuggestion[], target: string): string | null {
  return mappings.find((m) => m.target === target)?.column ?? null;
}

function isNumericColumn(rows: Row[], col: string): boolean {
  let total = 0;
  let numeric = 0;
  for (const r of rows) {
    const v = r[col];
    if (v == null || v === "") continue;
    total++;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) numeric++;
  }
  return total > 0 && numeric / total >= 0.7;
}

/**
 * Compute cohort numbers from the REAL previewed rows rather than mock factors.
 * Filters only apply when their column exists in the data, so a missing sex
 * column can no longer move the count, and a fake dataset with no usable numeric
 * data is reported as not analyzable. Counts are scaled from the sample to the
 * full row count (exact when the preview is the whole dataset).
 */
export function computeCohort(
  rows: Row[],
  totalRows: number,
  columns: string[],
  mappings: MappingSuggestion[],
  filters: CohortFilters,
  metsColumn?: string | null,
): CohortResult {
  const ageCol = findMappedColumn(mappings, "age_years");
  const sexCol = findMappedColumn(mappings, "sex");
  const canFilterAge = !!ageCol && isNumericColumn(rows, ageCol);
  const canFilterSex = !!sexCol && rows.some((r) => normalizeSexValue(r[sexCol]) !== null);
  const analyzable = rows.length > 0 && columns.some((c) => isNumericColumn(rows, c));

  let kept = 0;
  for (const r of rows) {
    if (canFilterAge && ageCol) {
      const a = Number(r[ageCol]);
      if (!Number.isFinite(a) || a < filters.ageMin || a > filters.ageMax) continue;
    }
    if (canFilterSex && sexCol && filters.sex !== "All") {
      if (normalizeSexValue(r[sexCol]) !== filters.sex) continue;
    }
    kept++;
  }

  const sampleSize = rows.length;
  const fraction = sampleSize > 0 ? kept / sampleSize : 0;
  const included = analyzable ? Math.round(totalRows * fraction) : 0;
  const pct = totalRows > 0 ? (included / totalRows) * 100 : 0;
  const sampled = sampleSize > 0 && sampleSize < totalRows;

  let prevalence: number | null = null;
  if (metsColumn) {
    let labelled = 0;
    let positive = 0;
    for (const r of rows) {
      const v = r[metsColumn];
      if (v == null || v === "") continue;
      labelled++;
      const n = typeof v === "number" ? v : Number(v);
      if (n === 1 || String(v).trim().toLowerCase() === "true") positive++;
    }
    prevalence = labelled > 0 ? (positive / labelled) * 100 : null;
  }

  return {
    included,
    pct,
    sampleSize,
    sampleIncluded: kept,
    canFilterAge,
    canFilterSex,
    analyzable,
    sampled,
    prevalence,
  };
}
