import type { Step } from "@/lib/pipeline-exec";
import type { ChartConfig, ChartType, Agg } from "@/lib/chart-config";
import type { SexEncoding } from "@/lib/column-mapping";
import * as api from "@/lib/api/projects";
import type { Project } from "@/lib/projects-store";

/** Current chart builder encodings (restored when reopening Visualisation). */
export type ChartDraft = {
  chartType: ChartType;
  x?: string;
  y?: string;
  series?: string;
  agg?: Agg;
  bins?: number;
  topN?: number;
};

/** AI Analysis wizard state saved against a project. */
export type AnalysisDraft = {
  runName: string;
  fnMode: "full" | "predict" | "discover" | "labels";
  selectedDatasetId: string | null;
  clinical: { field: string; target: string; column: string | null; score: number | null }[];
  dietary: { field: string; target: string; column: string | null; score: number | null }[];
  extraBpSys?: (string | null)[];
  extraBpDia?: (string | null)[];
  sexEncoding?: SexEncoding;
  ageMin: number;
  ageMax: number;
  sex: "All" | "Female" | "Male";
  excludePregnant: boolean;
  requireComplete: boolean;
  predictOn: boolean;
  predictModel: "xgb" | "logreg" | "both";
  subgroupOn: boolean;
  clusterAlg: "kmeans";
  dimRed: "pca" | "tsne";
  currentStep: "map" | "cohort" | "method" | "run";
  completed: ("map" | "cohort" | "method" | "run")[];
  skipped: ("map" | "cohort" | "method" | "run")[];
};

export type ProjectWorkPatch = {
  name?: string;
  datasets?: string[];
  pipelineSteps?: Step[];
  selectedAttrs?: Record<string, string[]>;
  charts?: ChartConfig[];
  chartDraft?: ChartDraft | null;
  analysisDraft?: AnalysisDraft | null;
};

export async function saveProjectWork(
  projectId: string,
  patch: ProjectWorkPatch,
): Promise<Project> {
  return api.patchProject(projectId, patch);
}
