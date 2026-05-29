import type { Project } from "@/lib/projects-store";
import type { RunResult } from "@/lib/pipeline-exec";

/** Virtual dataset id for the live pipeline output on a project (not persisted until saved). */
export const PIPELINE_MERGED_DATASET_ID = "__lotus_pipeline_merged__";

export function isPipelineMergedDatasetId(id: string | null | undefined): boolean {
  return id === PIPELINE_MERGED_DATASET_ID;
}

export function projectSelectedCols(project: Project): string[] {
  const out = new Set<string>();
  for (const cols of Object.values(project.selectedAttrs ?? {})) {
    for (const c of cols) out.add(c);
  }
  return [...out];
}

export function pipelineHasOutput(result: RunResult | undefined): boolean {
  return !!result && result.columns.length > 0 && result.totalRows > 0;
}

export function pipelineMergedLabel(projectName: string | undefined): string {
  const base = projectName?.trim() || "project";
  return `Merged (pipeline) · ${base}`;
}

/** True when the project has a non-trivial pipeline beyond an empty FROM step. */
export function projectHasPipelineWork(project: Project | undefined): boolean {
  const steps = project?.pipelineSteps;
  if (!steps?.length) return false;
  if (steps.length > 1) return true;
  const fromVal = steps[0]?.parts?.find((p) => p.label === "FROM")?.value?.trim();
  return Boolean(fromVal);
}
