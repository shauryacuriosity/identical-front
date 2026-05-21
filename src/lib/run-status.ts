/** Normalize analysis_runs.status from Supabase / API. */
export function isRunComplete(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "complete" || s === "completed";
}

export function isRunFailed(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "failed" || s === "error";
}

/** Run is actively executing on the API (poll until terminal). */
export function isRunInProgress(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "queued" || s === "running" || s === "processing";
}

/** User or UI may call POST /runs/:id/process. */
export function canTriggerProcess(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "pending" || s === "failed" || s === "error";
}

export function parseRunProgress(progress: unknown): { percent: number; step: string | null } {
  if (progress == null) return { percent: 0, step: null };
  if (typeof progress === "number" && !Number.isNaN(progress)) {
    return { percent: Math.max(0, Math.min(100, progress)), step: null };
  }
  if (typeof progress === "object") {
    const p = progress as { percent?: unknown; step?: unknown };
    const percent =
      typeof p.percent === "number" && !Number.isNaN(p.percent)
        ? Math.max(0, Math.min(100, p.percent))
        : 0;
    const step = typeof p.step === "string" ? p.step : null;
    return { percent, step };
  }
  return { percent: 0, step: null };
}
