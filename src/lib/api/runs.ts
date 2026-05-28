import { apiFetch, USE_MOCK } from "./client";

export type ProcessRunResponse = {
  run_id: string;
  status: string;
};

/** Queue backend processing for an analysis run (FastAPI background task). */
export async function processRun(
  runId: string,
  options?: { force?: boolean },
): Promise<ProcessRunResponse> {
  if (USE_MOCK) {
    throw new Error("Analysis processing requires the API server (set VITE_API_BASE_URL).");
  }
  const qs = options?.force ? "?force=true" : "";
  return apiFetch<ProcessRunResponse>(`/runs/${encodeURIComponent(runId)}/process${qs}`, {
    method: "POST",
  });
}
