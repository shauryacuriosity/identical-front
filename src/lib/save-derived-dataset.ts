import type { Attr, AttrType, Row } from "@/lib/dataset-import";
import type { RunResult } from "@/lib/pipeline-exec";
import * as apiDatasets from "@/lib/api/datasets";
import { registerDatasetTable } from "@/lib/dataset-tables";
import { __mockSeedSchema } from "@/lib/api/datasets";
import type { DatasetSummary } from "@/lib/api/types";

function inferType(name: string, samples: unknown[]): AttrType {
  const lower = name.toLowerCase();
  if (lower === "id" || lower.endsWith("_id") || lower === "seqn") return "id";
  const nonEmpty = samples.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonEmpty.length === 0) return "cat";
  const allNum = nonEmpty.every((v) => {
    if (typeof v === "number") return Number.isFinite(v);
    const n = Number(v);
    return !Number.isNaN(n) && Number.isFinite(n);
  });
  return allNum ? "num" : "cat";
}

function attrsFromResult(result: RunResult): Attr[] {
  const sample = result.rows.slice(0, 200);
  return result.columns.map((h) => ({
    name: h,
    type: inferType(
      h,
      sample.map((r) => r[h]),
    ),
  }));
}

export type SaveDerivedDatasetInput = {
  name: string;
  result: RunResult;
};

/**
 * Persist a pipeline / merged table as a named dataset in the app catalog (not a user file upload).
 * Mock mode: in-memory registry. Real mode: POST /datasets/from-result (CSV on server).
 */
export async function saveDerivedDataset(input: SaveDerivedDatasetInput): Promise<DatasetSummary> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("Enter a dataset name.");
  if (input.result.columns.length === 0 || input.result.totalRows === 0) {
    throw new Error("Nothing to save — run the pipeline and ensure the preview has rows.");
  }

  const rows = input.result.rows as Row[];
  const summary = await apiDatasets.saveFromResult({
    name: trimmed,
    columns: input.result.columns,
    rows,
    totalRows: input.result.totalRows,
  });

  const attrs = attrsFromResult(input.result);
  registerDatasetTable(summary.id, rows);
  __mockSeedSchema(summary.id, attrs, input.result.totalRows);

  return summary;
}
