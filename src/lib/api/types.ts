// Shared DTOs that cross the frontend ↔ backend seam.
// Re-exports keep existing imports working; new types live here.

export type { Project } from "@/lib/projects-store";
export type { Step, StepKind, RunResult } from "@/lib/pipeline-exec";
export type { Attr, AttrType, Row, ParsedDataset } from "@/lib/dataset-import";
export type { ChartConfig, ChartType, Agg, BuiltChart } from "@/lib/chart-config";

import type { Attr, Row } from "@/lib/dataset-import";

/** What `GET /datasets` returns per item. */
export type DatasetSummary = {
  id: string;          // stable backend ID; in mock mode = slot name
  name: string;        // display name / slot name
  rowCount: number | null;
  uploadedAt: string | null;
  status?: "ready" | "processing" | "error" | null;
};

/** What `GET /datasets/:id/schema` returns. */
export type DatasetSchema = {
  id: string;
  name: string;
  columns: Attr[];
};

/** What `GET /datasets/:id/preview?limit=` returns. */
export type DatasetPreview = {
  id: string;
  columns: string[];
  rows: Row[];
  totalRows: number;
  truncated: boolean;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
