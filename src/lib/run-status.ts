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

const STALE_RUN_MS = 12 * 60 * 1000;

function isStaleRun(startedAt: string | null | undefined): boolean {
  if (!startedAt) return true;
  const t = Date.parse(startedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > STALE_RUN_MS;
}

/** User or UI may call POST /runs/:id/process. */
export function canTriggerProcess(
  status: string | null | undefined,
  opts?: { startedAt?: string | null; force?: boolean },
): boolean {
  const s = (status ?? "").toLowerCase();
  if (s === "pending" || s === "failed" || s === "error") return true;
  if (s === "queued" || s === "running" || s === "processing") {
    return opts?.force === true || isStaleRun(opts?.startedAt);
  }
  return false;
}

export type FunctionMode = "full" | "prediction_only" | "subgroup_only" | "labels_only";

const VALID_FUNCTION_MODES = new Set<FunctionMode>([
  "full",
  "prediction_only",
  "subgroup_only",
  "labels_only",
]);

/** Wizard / API function_mode on analysis_runs. */
export function parseFunctionMode(raw: string | null | undefined): FunctionMode {
  const s = (raw ?? "full").trim().toLowerCase().replace(/-/g, "_");
  if (VALID_FUNCTION_MODES.has(s as FunctionMode)) return s as FunctionMode;
  return "full";
}

export function isLabelsOnlyMode(mode: FunctionMode): boolean {
  return mode === "labels_only";
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
