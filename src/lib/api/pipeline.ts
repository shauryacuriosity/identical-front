import { apiFetch, USE_MOCK } from "./client";
import { runPipeline, type Step, type RunResult } from "@/lib/pipeline-exec";
import { getDatasetTables } from "@/lib/dataset-tables";

export type PipelinePreviewRequest = {
  steps: Step[];
  selectedCols?: string[];
  limit?: number;
};

/**
 * Run a pipeline and return a preview. In mock mode this executes entirely
 * in the browser against the in-memory dataset registry. In real mode the
 * backend receives the pipeline spec and returns the same RunResult shape.
 */
export async function preview(req: PipelinePreviewRequest): Promise<RunResult> {
  if (USE_MOCK) {
    return runPipeline(req.steps, getDatasetTables(), req.selectedCols, { limit: req.limit });
  }
  return apiFetch<RunResult>("/pipeline/preview", { method: "POST", body: req });
}
