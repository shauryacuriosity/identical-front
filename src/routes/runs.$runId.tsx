import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CodesandboxIcon } from "@/components/brand-icons";
import { processRun } from "@/lib/api/runs";
import { USE_MOCK } from "@/lib/api/client";
import {
  isRunComplete,
  isRunFailed,
  isRunInProgress,
  canTriggerProcess,
  parseRunProgress,
} from "@/lib/run-status";

export const Route = createFileRoute("/runs/$runId")({
  component: RunPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-[1280px] px-6 pt-10">
      <p className="text-[14px] text-ink-2">Run not found.</p>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-[1280px] px-6 pt-10 flex flex-col gap-3">
        <p className="text-[14px] text-ink-2">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="text-coral underline w-fit text-[13px]"
        >
          Retry
        </button>
      </div>
    );
  },
});

// ---------- Helpers ----------

function Em() {
  return <span className="text-ink-2 opacity-50">—</span>;
}

function pct(v: number | null | undefined, dp = 1): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return `${(v * 100).toFixed(dp)}%`;
}

function num(v: number | null | undefined, dp = 2): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return v.toFixed(dp);
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-surface-hover/70 animate-pulse ${className}`} />;
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-[18px] text-ink leading-tight" style={{ letterSpacing: "-0.015em" }}>{title}</h2>
      {subtitle && <p className="text-[12.5px] text-ink-3 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3 font-medium">{children}</div>;
}

// ---------- Types ----------

type RunRow = {
  id: string;
  name: string | null;
  status: string | null;
  progress: unknown;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  dataset_id: string;
};

type ShapMap = Record<string, number>;
type ClusterSummary = {
  cluster_id: number;
  label: string | null;
  n: number | null;
  mets_prevalence: number | null;
  top_features?: { feature: string; mean: number }[] | null;
};

// ---------- Page ----------

function RunPage() {
  const { runId } = Route.useParams();

  const runQ = useQuery({
    queryKey: ["analysis_runs", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_runs")
        .select("id,name,status,progress,error_message,started_at,finished_at,dataset_id")
        .eq("id", runId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as RunRow | null;
    },
    refetchInterval: (q) => {
      const s = (q.state.data as RunRow | null | undefined)?.status;
      return isRunComplete(s) || isRunFailed(s) ? false : 1500;
    },
  });

  const queryClient = useQueryClient();
  const processMutation = useMutation({
    mutationFn: () => processRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["analysis_runs", runId] });
    },
  });

  const run = runQ.data;
  const status = run?.status ?? null;
  const isComplete = isRunComplete(status);
  const canStartProcessing = !USE_MOCK && run != null && canTriggerProcess(status);

  const autoStarted = useRef(false);
  useEffect(() => {
    if (!canStartProcessing || autoStarted.current) return;
    if ((status ?? "").toLowerCase() !== "pending") return;
    autoStarted.current = true;
    processMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per run when status is pending
  }, [canStartProcessing, status, runId]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 pb-24 pt-4 sm:pt-6 min-w-0">
      {/* Header */}
      <div className="text-[13px] text-ink-2 flex items-center gap-2 flex-wrap">
        <span>Run</span>
        <span className="text-ink-3">·</span>
        <span className="text-ink">{run?.name ?? <Em />}</span>
        <span className="text-ink-3">·</span>
        <span className="mono text-ink-3">{runId}</span>
        {status && (
          <>
            <span className="text-ink-3">·</span>
            <StatusPill status={status} />
          </>
        )}
      </div>

      {runQ.isLoading && (
        <div className="mt-6 rounded-2xl border border-hairline bg-surface p-6">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-2 w-full mt-4" />
        </div>
      )}

      {!runQ.isLoading && run == null && (
        <div className="mt-6 rounded-2xl border border-hairline bg-surface p-6 text-[13px] text-ink-2">
          Run not found.
        </div>
      )}

      {run && !isComplete && (
        <RunProgressCard
          run={run}
          canStart={canStartProcessing}
          onStart={() => processMutation.mutate()}
          starting={processMutation.isPending}
          startError={processMutation.error as Error | null}
        />
      )}

      {run && isComplete && (
        <>
          <SummaryAndModelPanel runId={runId} />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4">
            <ShapPanel runId={runId} />
            <ClustersPanel runId={runId} />
          </div>
          <PredictionsPanel runId={runId} />
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "var(--surface-hover)", fg: "var(--ink-2)" },
    running: { bg: "var(--coral-tint)", fg: "var(--coral)" },
    complete: { bg: "color-mix(in oklab, var(--data-sage) 18%, transparent)", fg: "color-mix(in oklab, var(--data-sage) 60%, var(--ink))" },
    failed: { bg: "var(--coral-tint)", fg: "var(--coral)" },
    error: { bg: "var(--coral-tint)", fg: "var(--coral)" },
    pending: { bg: "var(--surface-hover)", fg: "var(--ink-2)" },
    queued: { bg: "var(--coral-tint)", fg: "var(--coral)" },
  };
  const style = map[status] ?? map.pending;
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium border border-transparent"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {status}
    </span>
  );
}

function RunProgressCard({
  run,
  canStart,
  onStart,
  starting,
  startError,
}: {
  run: RunRow;
  canStart?: boolean;
  onStart?: () => void;
  starting?: boolean;
  startError?: Error | null;
}) {
  const { percent, step } = parseRunProgress(run.progress);
  const failed = isRunFailed(run.status);
  const pending = (run.status ?? "").toLowerCase() === "pending";

  return (
    <section className="mt-6 rounded-2xl border border-hairline bg-surface p-6 flex flex-col items-center text-center">
      <CodesandboxIcon size={120} strokeWidth={2} className={failed ? "text-coral" : "text-highlight"} />
      <div className="mt-4">
        <PanelHeader
          title={failed ? "Run failed" : pending ? "Waiting to start" : "Running analysis…"}
          subtitle={
            failed
              ? "Check the message below. You can retry if the issue was temporary."
              : pending
                ? "Start processing to run the pipeline on your dataset."
                : "This page updates automatically when results are ready."
          }
        />
      </div>
      {!failed && (
        <div className="mt-4 w-full max-w-md">
          <div className="h-2 w-full rounded-full bg-hairline overflow-hidden">
            <div className="h-full bg-coral transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 text-[12px] text-ink-3 tabular">
            {percent.toFixed(0)}%
            {step ? <span className="ml-2 normal-case tracking-normal text-ink-2">· {step.replace(/_/g, " ")}</span> : null}
          </div>
        </div>
      )}
      {run.error_message && (
        <p className="mt-3 text-[13px] text-coral max-w-md">{run.error_message}</p>
      )}
      {canStart && onStart && (
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="mt-4 min-h-11 h-11 px-5 rounded-lg bg-coral text-white text-[13px] font-semibold hover:opacity-95 disabled:opacity-50"
        >
          {starting ? "Starting…" : failed ? "Retry analysis" : "Start analysis"}
        </button>
      )}
      {startError && (
        <p className="mt-2 text-[12px] text-coral max-w-md">{startError.message}</p>
      )}
      {USE_MOCK && (
        <p className="mt-3 text-[12px] text-ink-3 max-w-md">
          Set <span className="mono">VITE_API_BASE_URL</span> and run the API server to process analyses.
        </p>
      )}
    </section>
  );
}

// ---------- Summary + model metrics ----------

type EdaRow = {
  n: number | null;
  mets_prevalence: number | null;
  mets_prevalence_by_sex: Record<string, number> | null;
  n_dietary_columns: number | null;
  figure_paths: unknown;
};
type ModelRow = {
  xgboost_metrics_test: Record<string, number> | null;
  shap_top_features: ShapMap | null;
  figure_paths: unknown;
};

function SummaryAndModelPanel({ runId }: { runId: string }) {
  const edaQ = useQuery({
    queryKey: ["eda_results", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eda_results")
        .select("n,mets_prevalence,mets_prevalence_by_sex,n_dietary_columns,figure_paths")
        .eq("run_id", runId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EdaRow | null;
    },
  });

  const modelQ = useQuery({
    queryKey: ["model_results", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_results")
        .select("xgboost_metrics_test,shap_top_features,artifact_paths")
        .eq("run_id", runId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ModelRow | null;
    },
  });

  const eda = edaQ.data;
  const m = modelQ.data?.xgboost_metrics_test ?? null;

  return (
    <section className="mt-6 rounded-2xl border border-hairline bg-surface p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-hairline/70">
        <div className="md:pr-6">
          <Caption>Cohort</Caption>
          {edaQ.isLoading ? (
            <div className="mt-3 space-y-2">
              <SkeletonBlock className="h-7 w-28" />
              <SkeletonBlock className="h-3 w-40" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
          ) : edaQ.error ? (
            <p className="mt-3 text-[12.5px] text-ink-3">Failed to load — {(edaQ.error as Error).message}</p>
          ) : (
            <>
              <div className="mt-2 text-[28px] text-ink tabular leading-none" style={{ letterSpacing: "-0.02em" }}>
                <span className="mono text-[26px]">{eda?.n != null ? eda.n.toLocaleString() : "—"}</span>{" "}
                <span className="text-[14px] text-ink-3 font-sans">rows</span>
              </div>
              <div className="mt-2 text-[13px] text-ink-2 tabular">
                {pct(eda?.mets_prevalence) ? <><span className="mono">{pct(eda?.mets_prevalence)}</span> MetS prevalence</> : <Em />}
              </div>
              {eda?.mets_prevalence_by_sex && (
                <div className="mt-1 text-[12.5px] text-ink-3 tabular flex flex-wrap gap-x-3 gap-y-1">
                  {Object.entries(eda.mets_prevalence_by_sex).map(([k, v]) => (
                    <span key={k}>
                      {k}: <span className="mono text-ink-2">{pct(v) ?? "—"}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1 text-[12.5px] text-ink-3 tabular">
                Dietary cols: <span className="mono">{eda?.n_dietary_columns ?? "—"}</span>
              </div>
            </>
          )}
        </div>

        <div className="md:pl-6">
          <Caption>Model performance (test set)</Caption>
          {modelQ.isLoading ? (
            <div className="mt-3 space-y-2">
              <SkeletonBlock className="h-7 w-32" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
          ) : modelQ.error ? (
            <p className="mt-3 text-[12.5px] text-ink-3">Failed to load — {(modelQ.error as Error).message}</p>
          ) : (
            <>
              <div className="mt-2 text-[28px] tabular leading-none" style={{ letterSpacing: "-0.02em", color: "var(--coral)" }}>
                <span className="text-[14px] text-ink-3 font-sans mr-2">Weighted AUC</span>
                <span className="mono">{num(m?.weighted_auc) ?? "—"}</span>
              </div>
              <div className="mt-2 text-[13px] text-ink-2 tabular flex flex-wrap gap-x-3 gap-y-1">
                <span>Precision <span className="mono text-ink">{num(m?.precision) ?? "—"}</span></span>
                <span>Recall <span className="mono text-ink">{num(m?.recall) ?? "—"}</span></span>
                <span>F1 <span className="mono text-ink">{num(m?.f1) ?? "—"}</span></span>
              </div>
              <div className="mt-2 text-[11.5px] text-ink-3 italic">XGBoost · test-set only</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- SHAP ----------

function ShapPanel({ runId }: { runId: string }) {
  const q = useQuery({
    queryKey: ["model_results_shap", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_results")
        .select("shap_top_features")
        .eq("run_id", runId)
        .maybeSingle();
      if (error) throw error;
      return ((data as { shap_top_features: ShapMap | null } | null)?.shap_top_features ?? null) as ShapMap | null;
    },
  });

  const items = q.data
    ? Object.entries(q.data)
        .filter(([, v]) => typeof v === "number")
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 10)
    : [];
  const max = items.length > 0 ? Math.max(...items.map(([, v]) => Math.abs(v))) : 1;

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6">
      <PanelHeader title="Top predictors of MetS" subtitle="Ranked by SHAP importance (top 10)" />
      <div className="mt-4 min-h-[280px]">
        {q.isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : q.error ? (
          <p className="text-[12.5px] text-ink-3">Failed to load — {(q.error as Error).message}</p>
        ) : items.length === 0 ? (
          <Em />
        ) : (
          <div className="space-y-2">
            {items.map(([feature, value]) => (
              <div key={feature} className="grid grid-cols-[minmax(0,1fr)_1fr_auto] sm:grid-cols-[170px_1fr_56px] items-center gap-2 sm:gap-3">
                <span className="text-[12.5px] text-ink mono truncate">{feature}</span>
                <div className="h-3 rounded-full bg-hairline overflow-hidden">
                  <div
                    className="h-full bg-coral"
                    style={{ width: `${(Math.abs(value) / max) * 100}%` }}
                  />
                </div>
                <span className="text-[11.5px] text-ink-2 mono tabular text-right">
                  {value.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Clusters ----------

const CLUSTER_COLOR_CYCLE = [
  "var(--coral)",
  "var(--data-sage)",
  "var(--data-slate)",
  "var(--data-ochre)",
  "var(--data-plum)",
];

function ClustersPanel({ runId }: { runId: string }) {
  const q = useQuery({
    queryKey: ["cluster_results", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cluster_results")
        .select("cluster_summaries,figure_paths")
        .eq("run_id", runId)
        .maybeSingle();
      if (error) throw error;
      return ((data as { cluster_summaries: ClusterSummary[] | null } | null)?.cluster_summaries ?? null) as ClusterSummary[] | null;
    },
  });

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6">
      <PanelHeader title="Sub-population clusters" subtitle="Per-cluster profiles and MetS prevalence" />
      <div className="mt-4">
        {q.isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : q.error ? (
          <p className="text-[12.5px] text-ink-3">Failed to load — {(q.error as Error).message}</p>
        ) : !q.data || q.data.length === 0 ? (
          <Em />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.data.map((c, idx) => {
              const color = CLUSTER_COLOR_CYCLE[idx % CLUSTER_COLOR_CYCLE.length];
              return (
                <div
                  key={c.cluster_id ?? idx}
                  className="rounded-xl border border-hairline bg-canvas/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-ink-3 mono">cluster {c.cluster_id ?? idx}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-ink font-medium leading-tight">
                    {c.label ?? `Cluster ${c.cluster_id ?? idx}`}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-2 tabular">
                    n = <span className="mono">{c.n ?? "—"}</span> · MetS{" "}
                    <span className="mono">{pct(c.mets_prevalence) ?? "—"}</span>
                  </div>
                  {c.top_features && c.top_features.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.top_features.slice(0, 4).map((f) => (
                        <span
                          key={f.feature}
                          className="mono text-[10.5px] px-1.5 py-0.5 rounded border border-hairline bg-surface-hover text-ink-2"
                        >
                          {f.feature}: {typeof f.mean === "number" ? f.mean.toFixed(2) : "—"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Per-subject predictions ----------

type PredictionRow = {
  subject_id: string;
  predicted_prob: number | null;
  predicted_label: boolean | null;
  actual_label: boolean | null;
  cluster_label: number | null;
};

const PAGE_SIZE = 50;

function PredictionsPanel({ runId }: { runId: string }) {
  const [page, setPage] = useState(0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const q = useQuery({
    queryKey: ["analysis_predictions", runId, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("analysis_predictions")
        .select("subject_id,predicted_prob,predicted_label,actual_label,cluster_label", {
          count: "exact",
        })
        .eq("run_id", runId)
        .order("subject_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as PredictionRow[], count: count ?? 0 };
    },
  });

  const total = q.data?.count ?? 0;
  const rows = q.data?.rows ?? [];
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const labelCell = (v: boolean | null) =>
    v == null ? <Em /> : v ? "✓" : "–";

  return (
    <section className="mt-4 rounded-2xl border border-hairline bg-surface p-6">
      <PanelHeader title="Per-subject predictions" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-3 border-b border-hairline">
              <th className="py-2 px-2 font-medium">subject_id</th>
              <th className="py-2 px-2 font-medium">predicted_prob</th>
              <th className="py-2 px-2 font-medium">predicted_label</th>
              <th className="py-2 px-2 font-medium">actual_label</th>
              <th className="py-2 px-2 font-medium">cluster_label</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-hairline/60">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-2.5 px-2">
                      <SkeletonBlock className="h-3 w-20" />
                    </td>
                  ))}
                </tr>
              ))}
            {!q.isLoading && q.error && (
              <tr>
                <td colSpan={5} className="py-3 px-2 text-[12.5px] text-ink-3">
                  Failed to load — {(q.error as Error).message}
                </td>
              </tr>
            )}
            {!q.isLoading && !q.error && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 px-2 text-[12.5px] text-ink-3">
                  No predictions
                </td>
              </tr>
            )}
            {!q.isLoading &&
              !q.error &&
              rows.map((r) => (
                <tr key={r.subject_id} className="border-b border-hairline/60 hover:bg-surface-hover/70 transition-colors">
                  <td className="py-2.5 px-2 align-middle"><span className="mono">{r.subject_id}</span></td>
                  <td className="py-2.5 px-2 align-middle">
                    {r.predicted_prob != null ? (
                      <div className="flex items-center gap-2">
                        <span className="mono tabular w-12">{(r.predicted_prob * 100).toFixed(1)}%</span>
                        <div className="h-1 w-16 rounded-full bg-hairline overflow-hidden">
                          <div className="h-full bg-coral" style={{ width: `${Math.max(0, Math.min(1, r.predicted_prob)) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                      <Em />
                    )}
                  </td>
                  <td className="py-2.5 px-2 align-middle"><span className="mono">{labelCell(r.predicted_label)}</span></td>
                  <td className="py-2.5 px-2 align-middle"><span className="mono">{labelCell(r.actual_label)}</span></td>
                  <td className="py-2.5 px-2 align-middle">
                    {r.cluster_label != null ? <span className="mono">{r.cluster_label}</span> : <Em />}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px] text-ink-3 tabular">
        <span>
          Showing <span className="mono">{total === 0 ? 0 : from + 1}</span>–
          <span className="mono">{Math.min(to + 1, total)}</span> of{" "}
          <span className="mono">{total.toLocaleString()}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || q.isLoading}
            className="min-h-11 h-11 px-4 rounded-md border border-hairline text-ink-2 hover:text-ink hover:border-coral/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage || q.isLoading}
            className="min-h-11 h-11 px-4 rounded-md border border-hairline text-ink-2 hover:text-ink hover:border-coral/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
