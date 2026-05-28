import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Plus,
  Network,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as apiDatasets from "@/lib/api/datasets";
import { processRun } from "@/lib/api/runs";
import { USE_MOCK } from "@/lib/api/client";
import { ProjectSaveBar } from "@/components/project-save-bar";
import { useProjects, useProject, formatRelative } from "@/lib/projects-store";
import { saveProjectWork, type AnalysisDraft } from "@/lib/project-work";
import { Slider } from "@/components/ui/slider";
import {
  autoMapAnalysisFields,
  CLINICAL_FIELDS,
  DIETARY_FIELDS,
  emptyMappings,
  type MappingSuggestion,
} from "@/lib/column-mapping";

export const Route = createFileRoute("/ai-analysis")({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === "string" ? s.projectId : undefined,
  }),
  component: AiAnalysisPage,
});

// C3:MOCK_GUARD — narrow check for the explicitly-forced mock flag (separate
// from the broader USE_MOCK, which also matches "no VITE_API_BASE_URL" mode).
const MOCK_API_FORCED = import.meta.env.VITE_USE_MOCK_API === "true";

/** Backend always runs EDA → both models → clustering; UI choices are stored but not applied yet. */
const PIPELINE_HONESTY =
  "The server currently runs the full pipeline (EDA, logistic + XGBoost, K-Means clustering) on every run. Function mode and most method settings below are saved for your record but not applied yet.";

// ---------- Mock data ----------

type Confidence = "auto" | "review" | "needs" | "manual" | "unmapped";

const FALLBACK_TOTAL_ROWS = 2431;

function compactColumn(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// ---------- Utilities ----------

function classifyScore(score: number | null, column: string | null): Confidence {
  if (!column) return "unmapped";
  if (score == null) return "manual";
  if (score >= 0.85) return "auto";
  if (score >= 0.65) return "review";
  return "needs";
}

function ConfidencePill({ row }: { row: MappingSuggestion }) {
  const kind = classifyScore(row.score, row.column);
  const base =
    "inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium tabular border";
  if (kind === "unmapped") {
    return (
      <span className={`${base} border-dashed border-hairline text-ink-3 bg-transparent`}>
        select column
      </span>
    );
  }
  if (kind === "manual") {
    return (
      <span className={`${base} border-hairline text-ink-2 bg-surface-hover`}>manual</span>
    );
  }
  const score = row.score!.toFixed(2);
  if (kind === "auto") {
    return (
      <span
        className={`${base} border-transparent`}
        style={{
          backgroundColor: "color-mix(in oklab, var(--data-sage) 15%, transparent)",
          color: "color-mix(in oklab, var(--data-sage) 65%, var(--ink))",
        }}
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
        auto · {score}
      </span>
    );
  }
  if (kind === "review") {
    return (
      <span
        className={`${base} border-transparent`}
        style={{
          backgroundColor: "color-mix(in oklab, var(--data-ochre) 18%, transparent)",
          color: "color-mix(in oklab, var(--data-ochre) 55%, var(--ink))",
        }}
      >
        review · {score}
      </span>
    );
  }
  return (
    <span
      className={`${base} border-coral/30`}
      style={{ backgroundColor: "var(--coral-tint)", color: "var(--coral)" }}
    >
      needs review · {score}
    </span>
  );
}

// ---------- Step indicator ----------

type StepKey = "map" | "cohort" | "method" | "run";
const STEPS: { key: StepKey; label: string }[] = [
  { key: "map", label: "Map" },
  { key: "cohort", label: "Cohort" },
  { key: "method", label: "Method" },
  { key: "run", label: "Run" },
];

function StepIndicator({
  current,
  completed,
  running,
  skipped,
}: {
  current: StepKey;
  completed: Set<StepKey>;
  running: boolean;
  skipped?: Set<StepKey>;
}) {
  return (
    <div className="sticky top-16 sm:top-20 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-canvas/85 backdrop-blur-md border-b border-hairline overflow-x-auto">
      <ol className="mx-auto max-w-[1280px] flex items-center gap-2 min-w-[min(100%,320px)]">
        {STEPS.map((s, i) => {
          const isSkipped = skipped?.has(s.key) ?? false;
          const isDone = completed.has(s.key) && !isSkipped;
          const isActive = current === s.key && !isSkipped;
          const isRunStepRunning = s.key === "run" && running;
          const nextSkipped = skipped?.has(STEPS[i + 1]?.key);
          return (
            <li key={s.key} className="flex items-center gap-2 flex-1 last:flex-none shrink-0">
              <div className={`flex items-center gap-2 ${isSkipped ? "opacity-50" : ""}`}>
                <span
                  className={`h-7 w-7 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[11px] tabular border transition-colors ${
                    isSkipped
                      ? "bg-surface text-ink-3 border-dashed border-hairline"
                      : isDone
                        ? "bg-coral text-white border-coral"
                        : isActive
                          ? "bg-coral-tint text-coral border-coral/40"
                          : "bg-surface text-ink-3 border-hairline"
                  }`}
                >
                  {isSkipped ? (
                    <span className="text-[9px]">—</span>
                  ) : isDone ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : isRunStepRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-[12.5px] font-medium hidden sm:inline ${
                    isActive || isDone ? "text-ink" : "text-ink-3"
                  }`}
                >
                  {s.label}
                  {isSkipped && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-[0.08em] text-ink-3">n/a</span>
                  )}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px ${isSkipped || nextSkipped ? "border-t border-dashed border-hairline" : "bg-hairline"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- Mapping row ----------

function MappingRow({
  row,
  columns,
  onChange,
}: {
  row: MappingSuggestion;
  columns: string[];
  onChange: (column: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_16px_1fr_auto] items-start sm:items-center gap-2 sm:gap-3 py-3 sm:py-2.5 border-b border-hairline/60 last:border-b-0">
      <span className="text-[13.5px] text-ink font-medium">{row.field}</span>
      <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-ink-3" />
      <div className="relative sm:col-auto">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`mono inline-flex items-center gap-1.5 min-h-11 h-11 sm:min-h-0 sm:h-7 px-3 sm:px-2 rounded-md text-[12px] border transition-colors w-full sm:w-auto ${
            row.column
              ? "border-hairline bg-surface-hover text-ink hover:border-coral/40"
              : "border-dashed border-hairline text-ink-3 hover:text-ink"
          }`}
        >
          {row.column ?? "—"}
          <ChevronDown className={`h-3 w-3 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-56 max-h-64 overflow-auto rounded-lg border border-hairline bg-surface shadow-[var(--shadow-md)] p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`mono w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-surface-hover ${
                row.column == null ? "text-coral" : "text-ink-3"
              }`}
            >
              — unmapped
            </button>
            {columns.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`mono w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-surface-hover ${
                  c === row.column ? "text-coral" : "text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      <ConfidencePill row={row} />
    </div>
  );
}

// ---------- Step shell ----------

function StepShell({
  index,
  title,
  state,
  summary,
  onExpand,
  children,
}: {
  index: number;
  title: string;
  state: "locked" | "active" | "complete";
  summary?: string;
  onExpand?: () => void;
  children: React.ReactNode;
}) {
  const locked = state === "locked";
  const complete = state === "complete";
  return (
    <section
      className={`rounded-2xl border border-hairline bg-surface transition-opacity ${
        locked ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={complete ? onExpand : undefined}
        disabled={locked}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-7 w-7 rounded-full flex items-center justify-center text-[12px] tabular border ${
              complete
                ? "bg-coral text-white border-coral"
                : locked
                  ? "bg-surface text-ink-3 border-hairline"
                  : "bg-coral-tint text-coral border-coral/40"
            }`}
          >
            {complete ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index}
          </span>
          <div>
            <div className="text-[15px] font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
              {title}
            </div>
            {complete && summary && (
              <div className="text-[12.5px] text-ink-2 mt-0.5">{summary}</div>
            )}
          </div>
        </div>
        {complete && <ChevronRight className="h-4 w-4 text-ink-3 rotate-90" />}
      </button>
      {state !== "locked" && (
        <div
          className={`px-6 pb-6 pt-1 border-t border-hairline/60 ${
            complete && state !== "active" ? "opacity-90" : ""
          }`}
        >
          {children}
        </div>
      )}
    </section>
  );
}

// ---------- Page ----------

function AiAnalysisPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useSearch();
  const projects = useProjects();
  const project = useProject(projectId);
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1)),
    [projects],
  );
  const [saving, setSaving] = useState(false);
  const draftRestoredFor = useRef<string | null>(null);
  const skipAutoMapOnce = useRef(false);

  const [runName, setRunName] = useState(
    () => `Untitled run · ${new Date().toISOString().slice(0, 16)}`,
  );
  const [editingName, setEditingName] = useState(false);

  // Function mode — what are you running?
  type FnMode = "full" | "predict" | "discover" | "labels";
  const [fnMode, setFnMode] = useState<FnMode>("full");
  const [metsLabelCol, setMetsLabelCol] = useState<string | null>(null);

  // Live dataset selection (Step 1)
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  type DatasetOption = { id: string; name: string; row_count: number | null };
  const datasetsQ = useQuery({
    queryKey: ["datasets", "ready"],
    queryFn: async () => {
      const all = await apiDatasets.list();
      return all
        .filter((d) => (d.status ?? "ready") === "ready")
        .map(
          (d): DatasetOption => ({
            id: d.id,
            name: d.name,
            row_count: d.rowCount,
          }),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
  const selectedDataset = datasetsQ.data?.find((d) => d.id === selectedDatasetId) ?? null;

  const previewQ = useQuery({
    queryKey: ["datasets", "preview", selectedDatasetId],
    queryFn: () => apiDatasets.preview(selectedDatasetId!, 200),
    enabled: !!selectedDatasetId,
  });
  const datasetColumns = previewQ.data?.columns ?? [];

  const [clinical, setClinical] = useState(() => emptyMappings(CLINICAL_FIELDS));
  const [dietary, setDietary] = useState(() => emptyMappings(DIETARY_FIELDS));

  const [ageMin, setAgeMin] = useState(20);
  const [ageMax, setAgeMax] = useState(65);
  const [sex, setSex] = useState<"All" | "Female" | "Male">("All");
  const [excludePregnant, setExcludePregnant] = useState(true);
  const [requireComplete, setRequireComplete] = useState(true);

  // Prediction section
  const [predictOn, setPredictOn] = useState(true);
  const [predictModel, setPredictModel] = useState<"xgb" | "logreg" | "both">("both");

  // Subgroup discovery section
  const [subgroupOn, setSubgroupOn] = useState(true);
  const [clusterAlg, setClusterAlg] = useState<"kmeans">("kmeans");
  const [dimRed, setDimRed] = useState<"pca" | "tsne">("pca");

  const [currentStep, setCurrentStep] = useState<StepKey>("map");
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());
  const [skipped, setSkipped] = useState<Set<StepKey>>(new Set());

  // Effective on-flags based on fnMode
  const showPredict = fnMode === "full" || fnMode === "predict";
  const showSubgroup = fnMode === "full" || fnMode === "discover";
  const methodSkipped = fnMode === "labels";

  // Map UI fnMode -> canonical function_mode enum
  const fnModeEnum = (m: FnMode): "full" | "prediction_only" | "subgroup_only" | "labels_only" =>
    m === "full" ? "full"
      : m === "predict" ? "prediction_only"
        : m === "discover" ? "subgroup_only"
          : "labels_only";

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDatasetId) throw new Error("Select a dataset first.");
      const payload = {
        dataset_id: selectedDatasetId,
        name: runName,
        function_mode: fnModeEnum(fnMode),
        cohort_filter: {
          age_min: ageMin,
          age_max: ageMax,
          sex: sex.toLowerCase(),
          exclude_pregnant: excludePregnant,
          require_complete: requireComplete,
        },
        method_config: {
          prediction:
            showPredict && predictOn ? { model: predictModel } : null,
          subgroup:
            showSubgroup && subgroupOn
              ? { algorithm: clusterAlg, k: 4, projection: dimRed }
              : null,
        },
        status: "pending",
      };
      const { data, error } = await supabase
        .from("analysis_runs")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;
      const run = data as { id: string };
      if (!USE_MOCK) {
        await processRun(run.id);
      }
      return run;
    },
    onSuccess: (data) => {
      navigate({ to: "/runs/$runId", params: { runId: data.id } });
    },
  });

  const runSubmitting = runMutation.isPending;
  const labelsRunTriggered = useRef(false);

  const canStartRun =
    !MOCK_API_FORCED &&
    !!selectedDatasetId &&
    !runMutation.isPending &&
    (methodSkipped || (predictOn || subgroupOn));

  const startRun = () => {
    if (MOCK_API_FORCED || !selectedDatasetId || runMutation.isPending) return;
    if (!methodSkipped && !predictOn && !subgroupOn) return;
    runMutation.mutate();
  };

  // Labels-only skips Method — start the run when landing on the Run step.
  useEffect(() => {
    if (
      currentStep !== "run" ||
      !methodSkipped ||
      MOCK_API_FORCED ||
      !selectedDatasetId ||
      runMutation.isPending ||
      runMutation.isSuccess ||
      labelsRunTriggered.current
    ) {
      return;
    }
    labelsRunTriggered.current = true;
    runMutation.mutate();
  }, [
    currentStep,
    methodSkipped,
    selectedDatasetId,
    runMutation.isPending,
    runMutation.isSuccess,
  ]);

  useEffect(() => {
    if (currentStep !== "run") {
      labelsRunTriggered.current = false;
    }
  }, [currentStep]);

  // Derived cohort numbers
  const totalRows = selectedDataset?.row_count ?? FALLBACK_TOTAL_ROWS;
  const cohort = useMemo(() => {
    const ageBreadth = (ageMax - ageMin) / 100;
    const sexFactor = sex === "All" ? 1 : 0.51;
    const pregFactor = excludePregnant ? 0.96 : 1;
    const completeFactor = requireComplete ? 0.92 : 1;
    const included = Math.round(totalRows * ageBreadth * sexFactor * pregFactor * completeFactor);
    const pct = totalRows > 0 ? (included / totalRows) * 100 : 0;
    const prevalence = 18 + (ageMin + ageMax) / 20; // mock
    const meanAge = (ageMin + ageMax) / 2;
    return {
      included,
      pct,
      prevalence: Math.min(prevalence, 38),
      meanAge,
    };
  }, [ageMin, ageMax, sex, excludePregnant, requireComplete, totalRows]);

  const stepState = (key: StepKey): "locked" | "active" | "complete" => {
    if (completed.has(key)) return "complete";
    if (currentStep === key) return "active";
    return "locked";
  };

  const cohortSummary = `${cohort.included.toLocaleString()} of ${totalRows.toLocaleString()} rows · age ${ageMin}–${ageMax} · ${sex === "All" ? "all sexes" : sex} · ${excludePregnant ? "pregnant excluded" : "pregnant included"}`;

  const predictSummary = (() => {
    if (!showPredict || !predictOn) return null;
    if (predictModel === "xgb") return "XGBoost (UI only — server runs both)";
    if (predictModel === "logreg") return "Logistic Regression (UI only — server runs both)";
    return "Logistic + XGBoost (matches server)";
  })();
  const subgroupSummary = (() => {
    if (!showSubgroup || !subgroupOn) return null;
    return "K-Means k=4 on DR1I · PCA + t-SNE figures (server default)";
  })();
  const methodSummary = [predictSummary, subgroupSummary].filter(Boolean).join(" · ");

  const advanceFrom = (from: StepKey, to: StepKey) => {
    setCompleted((c) => new Set(c).add(from));
    setCurrentStep(to);
  };

  // Step 2 → next: skip Method when in "labels" mode
  const continueFromCohort = () => {
    if (methodSkipped) {
      setCompleted((c) => {
        const next = new Set(c);
        next.add("cohort");
        next.add("method");
        return next;
      });
      setSkipped((s) => new Set(s).add("method"));
      setCurrentStep("run");
    } else {
      setSkipped((s) => {
        const next = new Set(s);
        next.delete("method");
        return next;
      });
      advanceFrom("cohort", "method");
    }
  };

  const reopen = (key: StepKey) => {
    setCompleted((c) => {
      const next = new Set(c);
      // Mark this and everything after as stale
      let strike = false;
      for (const s of STEPS) {
        if (s.key === key) strike = true;
        if (strike) next.delete(s.key);
      }
      return next;
    });
    setCurrentStep(key);
  };

  useEffect(() => {
    draftRestoredFor.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!selectedDatasetId) {
      setClinical(emptyMappings(CLINICAL_FIELDS));
      setDietary(emptyMappings(DIETARY_FIELDS));
      setMetsLabelCol(null);
      return;
    }
    if (!previewQ.data || previewQ.data.id !== selectedDatasetId) return;
    if (skipAutoMapOnce.current) {
      skipAutoMapOnce.current = false;
      return;
    }
    const mapped = autoMapAnalysisFields(previewQ.data.columns, previewQ.data.rows);
    setClinical(mapped.clinical);
    setDietary(mapped.dietary);
    const metsCol =
      previewQ.data.columns.find((c) => compactColumn(c) === "mets") ??
      previewQ.data.columns.find((c) => compactColumn(c).includes("mets")) ??
      null;
    setMetsLabelCol(metsCol);
  }, [selectedDatasetId, previewQ.data]);

  useEffect(() => {
    if (!projectId || !project?.analysisDraft) return;
    if (draftRestoredFor.current === projectId) return;
    draftRestoredFor.current = projectId;
    skipAutoMapOnce.current = true;
    const d = project.analysisDraft;
    setRunName(d.runName);
    setFnMode(d.fnMode);
    setSelectedDatasetId(d.selectedDatasetId);
    setClinical(d.clinical);
    setDietary(d.dietary);
    setAgeMin(d.ageMin);
    setAgeMax(d.ageMax);
    setSex(d.sex);
    setExcludePregnant(d.excludePregnant);
    setRequireComplete(d.requireComplete);
    setPredictOn(d.predictOn);
    setPredictModel(d.predictModel);
    setSubgroupOn(d.subgroupOn);
    setClusterAlg(d.clusterAlg);
    setDimRed(d.dimRed);
    setCurrentStep(d.currentStep);
    setCompleted(new Set(d.completed));
    setSkipped(new Set(d.skipped));
  }, [projectId, project?.analysisDraft]);

  const buildAnalysisDraft = (): AnalysisDraft => ({
    runName,
    fnMode,
    selectedDatasetId,
    clinical,
    dietary,
    ageMin,
    ageMax,
    sex,
    excludePregnant,
    requireComplete,
    predictOn,
    predictModel,
    subgroupOn,
    clusterAlg,
    dimRed,
    currentStep,
    completed: [...completed],
    skipped: [...skipped],
  });

  const handleSaveDraft = async () => {
    if (!projectId) {
      toast.error("Link a project first", {
        description: "Choose a project below to save your analysis setup.",
      });
      return;
    }
    setSaving(true);
    try {
      await saveProjectWork(projectId, { analysisDraft: buildAnalysisDraft() });
      toast.success("Analysis draft saved", {
        description: "Mappings, cohort filters, and method settings.",
      });
    } catch (err) {
      toast.error("Couldn't save draft", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 pb-24 min-w-0 overflow-x-hidden">
      {/* Breadcrumb + project link */}
      <div className="pt-4 sm:pt-6 pb-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span>Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Project</span>
          <div className="relative">
            <select
              value={projectId ?? ""}
              onChange={(e) => {
                const id = e.target.value || undefined;
                navigate({ to: "/ai-analysis", search: { projectId: id } });
              }}
              className="appearance-none min-h-11 h-11 pl-3 pr-8 text-[13px] rounded-md border border-hairline bg-surface text-ink hover:border-coral/40 focus:outline-none focus:border-coral w-full sm:min-w-[220px]"
            >
              <option value="">No project linked</option>
              {sortedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || "Untitled project"} · {formatRelative(p.modifiedAt)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Run name */}
      <div className="mb-5">
        <label htmlFor="run-name" className="block text-[11px] uppercase tracking-[0.12em] text-ink-2 font-medium mb-1.5">
          Run name
        </label>
        <input
          id="run-name"
          value={runName}
          onChange={(e) => setRunName(e.target.value)}
          onFocus={() => setEditingName(true)}
          onBlur={() => setEditingName(false)}
          className={`w-full max-w-xl h-11 px-3 rounded-lg border bg-surface text-ink text-[15px] font-medium focus:outline-none focus:border-coral/70 transition-colors ${
            editingName ? "border-coral/60" : "border-hairline"
          }`}
        />
      </div>


      <StepIndicator current={currentStep} completed={completed} running={runSubmitting} skipped={skipped} />

      <div className="mt-6 flex flex-col gap-4">
        {/* STEP 1 — Map */}
        <StepShell
          index={1}
          title="Map to analysis fields"
          state={stepState("map")}
          summary={`${clinical.length} clinical · ${dietary.length} model inputs`}
          onExpand={() => reopen("map")}
        >
          <div className="space-y-6 pt-4">
            {/* Function-mode selector */}
            <div>
              <h3 className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
                What are you running?
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["full", "Full analysis", "predict + discover", "Runs EDA, both models, and clustering (server default pipeline)."],
                    ["predict", "Prediction only", null, "UI preview — server still runs the full pipeline today."],
                    ["discover", "Subgroup discovery only", null, "UI preview — server still runs the full pipeline today."],
                    ["labels", "Generate labels only", null, "Skips method step; server still runs EDA + models + clustering."],
                  ] as const
                ).map(([key, label, hint, description]) => {
                  const active = fnMode === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFnMode(key)}
                      title={description}
                      className={`h-auto min-h-7 px-3 py-1.5 rounded-full text-[12.5px] border transition-colors text-left ${
                        active
                          ? "bg-coral text-white border-coral"
                          : "bg-surface border-hairline text-ink-2 hover:text-ink hover:border-coral/40"
                      }`}
                    >
                      <span className="block">{label}</span>
                      {hint && (
                        <span className={`block text-[11px] ${active ? "text-white/75" : "text-ink-3"}`}>
                          {hint}
                        </span>
                      )}
                      <span className={`block text-[11px] mt-0.5 ${active ? "text-white/70" : "text-ink-3"}`}>
                        {description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[13.5px] text-ink-2">
              Confirm how your dataset columns map to the fields we need.
            </p>

            {/* Dataset selector */}
            <div className="max-w-md">
              <DatasetSelector
                datasets={datasetsQ.data ?? []}
                isLoading={datasetsQ.isLoading}
                error={datasetsQ.error as Error | null}
                value={selectedDatasetId}
                onChange={setSelectedDatasetId}
              />
              {selectedDatasetId && previewQ.isLoading && (
                <p className="mt-2 text-[12px] text-ink-3 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Auto-mapping columns…
                </p>
              )}
              {selectedDatasetId && !previewQ.isLoading && previewQ.data && (
                <p className="mt-2 text-[12px] text-ink-3">
                  Mapped from {previewQ.data.columns.length} columns · scores reflect name + value checks
                </p>
              )}
            </div>

            {/* C3:BANNER START — column-mapping disclaimer (owned by C3; C2 may relocate as a whole) */}
            <div
              role="note"
              aria-label="Column mappings preview disclaimer"
              className="flex items-start gap-2.5 rounded-lg border border-dashed border-coral/40 bg-coral-tint/50 px-3 py-2.5"
            >
              <Info className="h-4 w-4 text-coral mt-0.5 shrink-0" strokeWidth={1.75} />
              <p className="text-[12.5px] text-ink leading-snug">
                <span className="font-medium">Preview only</span>
                <span className="text-ink-2"> — column mappings are not yet applied to the ML run.</span>
              </p>
            </div>
            {/* C3:BANNER END */}

            {/* Group A — MetS Clinical */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium">
                  MetS Clinical Criteria
                </h3>
                {fnMode === "predict" && metsLabelCol && (
                  <span className="text-[11px] text-ink-3 italic">optional · used for verification</span>
                )}
                {fnMode === "discover" && (
                  <span className="text-[11px] text-ink-3 italic">optional · clustering doesn't need a label</span>
                )}
              </div>
              <div
                className={`rounded-xl border border-hairline bg-canvas/40 px-4 ${
                  fnMode === "discover" || (fnMode === "predict" && metsLabelCol) ? "opacity-70" : ""
                }`}
              >
                {fnMode === "predict" && (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_16px_1fr_auto] items-start sm:items-center gap-2 sm:gap-3 py-3 sm:py-2.5 border-b border-hairline/60">
                    <span className="text-[13.5px] text-ink font-medium">
                      MetS label
                      <span className="ml-1.5 text-[11px] text-ink-3 font-normal">
                        (if already in your data)
                      </span>
                    </span>
                    <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-ink-3" />
                    <div>
                      <button
                        onClick={() =>
                          setMetsLabelCol((c) => (c ? null : "mets_label"))
                        }
                        className={`mono inline-flex items-center gap-1.5 min-h-11 h-11 sm:min-h-0 sm:h-7 px-3 sm:px-2 rounded-md text-[12px] border transition-colors w-full sm:w-auto ${
                          metsLabelCol
                            ? "border-hairline bg-surface-hover text-ink hover:border-coral/40"
                            : "border-dashed border-hairline text-ink-3 hover:text-ink"
                        }`}
                      >
                        {metsLabelCol ?? "Select column"}
                        <ChevronDown className={`h-3 w-3 text-ink-2 transition-transform ${metsLabelCol ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    <span />
                  </div>
                )}
                {clinical.map((r, i) => (
                  <MappingRow
                    key={r.target}
                    row={r}
                    columns={datasetColumns}
                    onChange={(col) =>
                      setClinical((rows) => {
                        const next = [...rows];
                        next[i] = { ...next[i], column: col, score: null };
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {/* Group B — Demographics & Dietary (hidden in labels mode) */}
            {fnMode !== "labels" && (
              <div>
                <h3 className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
                  Demographics & Dietary Features
                </h3>
                <div className="rounded-xl border border-hairline bg-canvas/40 px-4">
                  {dietary.map((r, i) => (
                    <MappingRow
                      key={r.target}
                      row={r}
                      columns={datasetColumns}
                      onChange={(col) =>
                        setDietary((rows) => {
                          const next = [...rows];
                          next[i] = { ...next[i], column: col, score: null };
                          return next;
                        })
                      }
                    />
                  ))}
                  <button
                    onClick={() =>
                      setDietary((rows) => [
                        ...rows,
                        { field: "New field", target: `new_${Date.now()}_${rows.length}`, column: null, score: null },
                      ])
                    }
                    className="w-full py-2.5 flex items-center gap-2 text-[12.5px] text-ink-2 hover:text-coral transition-colors border-t border-hairline/60"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add field
                  </button>
                </div>
              </div>
            )}

            {/* Annotation */}
            <div className="flex gap-3 rounded-xl bg-surface-hover border border-hairline/70 p-4">
              <Info className="h-4 w-4 text-ink-3 mt-0.5 shrink-0" />
              <p className="text-[13px] text-ink-2 leading-relaxed">
                MetS labels are computed using NCEP ATP III criteria (5-component rule: waist,
                triglycerides, HDL, blood pressure, fasting glucose; ≥3 abnormal). The model
                predicts MetS from diet and demographics only — clinical lab values are used to{" "}
                <em className="text-ink">label</em>, not to{" "}
                <em className="text-ink">predict</em>. This is the eAsia framing.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => advanceFrom("map", "cohort")}
                disabled={!selectedDatasetId || previewQ.isLoading}
                className="min-h-11 h-11 px-5 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Cohort →
              </button>
              {!selectedDatasetId && (
                <span className="text-[12px] text-ink-3">Select a dataset to auto-map columns.</span>
              )}
            </div>
          </div>
        </StepShell>

        {/* STEP 2 — Cohort */}
        <StepShell
          index={2}
          title="Define cohort"
          state={stepState("cohort")}
          summary={cohortSummary}
          onExpand={() => reopen("cohort")}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 pt-4">
            <div className="space-y-6">
              <p className="text-[13.5px] text-ink-2 -mt-2">Filter your study population.</p>

              {/* Age range */}
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium">
                  Age range
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={ageMin}
                    min={0}
                    max={ageMax - 1}
                    onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 1))}
                    className="mono w-16 h-9 px-2 text-[13px] rounded-md border border-hairline bg-surface text-ink text-center focus:outline-none focus:border-coral/50"
                  />
                  <div className="flex-1 px-1 py-3 sm:py-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2">
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      minStepsBetweenThumbs={1}
                      value={[ageMin, ageMax]}
                      onValueChange={([min, max]) => {
                        setAgeMin(min);
                        setAgeMax(max);
                      }}
                    />
                  </div>
                  <input
                    type="number"
                    value={ageMax}
                    min={ageMin + 1}
                    max={100}
                    onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 1))}
                    className="mono w-16 h-9 px-2 text-[13px] rounded-md border border-hairline bg-surface text-ink text-center focus:outline-none focus:border-coral/50"
                  />
                </div>
              </div>

              {/* Sex */}
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium">Sex</label>
                <div className="flex gap-1.5">
                  {(["All", "Female", "Male"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={`min-h-11 h-11 px-4 rounded-full text-[12.5px] border transition-colors ${
                        sex === s
                          ? "bg-coral text-white border-coral"
                          : "bg-surface border-hairline text-ink-2 hover:text-ink hover:border-coral/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <ToggleRow
                  label="Exclude pregnant participants"
                  on={excludePregnant}
                  onChange={setExcludePregnant}
                />
                <ToggleRow
                  label="Require complete data for mapped fields"
                  on={requireComplete}
                  onChange={setRequireComplete}
                />
              </div>
            </div>

            {/* Cohort preview */}
            <aside className="rounded-xl border border-hairline bg-canvas/40 p-5 h-fit">
              <div className="text-[11px] uppercase tracking-[0.12em] text-ink-3 font-medium">Cohort preview</div>
              <div className="mt-3 text-[26px] text-ink tabular leading-tight" style={{ letterSpacing: "-0.02em" }}>
                {cohort.included.toLocaleString()}
                <span className="text-[14px] text-ink-3 font-sans"> of {totalRows.toLocaleString()} rows</span>
              </div>
              <div className="text-[12.5px] text-ink-2 tabular">{cohort.pct.toFixed(1)}% of dataset</div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[12px] text-ink-2">Estimated MetS prevalence</span>
                  <span className="text-[12.5px] text-ink font-medium tabular">{cohort.prevalence.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex bg-hairline">
                  <div
                    style={{
                      width: `${100 - cohort.prevalence}%`,
                      backgroundColor: "color-mix(in oklab, var(--data-sage) 70%, white)",
                    }}
                  />
                  <div
                    style={{ width: `${cohort.prevalence}%`, backgroundColor: "var(--coral)" }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "color-mix(in oklab, var(--data-sage) 70%, white)" }} />
                    No MetS
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-coral" />
                    MetS
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-hairline/60 text-[12.5px] text-ink-2 tabular">
                Mean age {cohort.meanAge.toFixed(1)} · 51% F / 49% M
              </div>
            </aside>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={continueFromCohort}
              className="min-h-11 h-11 px-5 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition"
            >
              {methodSkipped ? "Continue to Run →" : "Continue to Method →"}
            </button>
          </div>
        </StepShell>

        {/* STEP 3 — Method (skipped in labels mode) */}
        {!methodSkipped && (
          <StepShell
            index={3}
            title="Select method"
            state={stepState("method")}
            summary={methodSummary || "No methods selected"}
            onExpand={() => reopen("method")}
          >
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-hairline bg-canvas/40 px-3 py-2.5">
                <Info className="h-4 w-4 text-ink-3 mt-0.5 shrink-0" strokeWidth={1.75} />
                <p className="text-[12.5px] text-ink-2 leading-snug">{PIPELINE_HONESTY}</p>
              </div>

              {/* SECTION A — Prediction */}
              {showPredict && (
                <MethodSection
                  icon={<Network className="h-5 w-5" strokeWidth={1.75} />}
                  title="Prediction"
                  subtitle="supervised · what predicts MetS in this cohort?"
                  enabled={predictOn}
                  onToggle={() => setPredictOn((v) => !v)}
                >
                  <div className="space-y-5">
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
                        Model
                      </div>
                      <div className="space-y-1.5">
                        <RadioRow
                          checked={predictModel === "both"}
                          onSelect={() => setPredictModel("both")}
                          title="Compare both"
                          hint="matches server — trains logistic regression and XGBoost every run"
                        />
                        <RadioRow
                          checked={predictModel === "xgb"}
                          onSelect={() => setPredictModel("xgb")}
                          title="XGBoost only"
                          hint="gradient-boosted trees with SHAP importance"
                          disabled
                          tooltip="Coming soon — server currently trains both models every run"
                        />
                        <RadioRow
                          checked={predictModel === "logreg"}
                          onSelect={() => setPredictModel("logreg")}
                          title="Logistic Regression only"
                          hint="L2-regularised, interpretable coefficients"
                          disabled
                          tooltip="Coming soon — server currently trains both models every run"
                        />
                      </div>
                    </div>

                    {/* Defaults (informational — backend does not accept overrides for v1) */}
                    <div className="rounded-lg border border-hairline/70 bg-canvas/40 px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3 font-medium mb-1">
                        Defaults
                      </div>
                      <p className="mono text-[11.5px] text-ink-2 leading-relaxed">
                        XGBoost (n_estimators=400, max_depth=4, learning_rate=0.05). Logistic (L2
                        regularised, max_iter=4000). Decision threshold 0.5.
                      </p>
                    </div>

                    <p className="text-[12.5px] text-ink-3 italic">
                      Server output: weighted test AUC, accuracy, precision, recall, F1 for both
                      models; SHAP top features (XGBoost); logistic coefficients; per-subject
                      predictions saved to the run.
                    </p>
                  </div>
                </MethodSection>
              )}

              {/* SECTION B — Subgroup Discovery */}
              {showSubgroup && (
                <MethodSection
                  icon={<Boxes className="h-5 w-5" strokeWidth={1.75} />}
                  title="Subgroup Discovery"
                  subtitle="unsupervised · what sub-populations exist?"
                  enabled={subgroupOn}
                  onToggle={() => setSubgroupOn((v) => !v)}
                >
                  <div className="space-y-5">
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
                        Clustering algorithm
                      </div>
                      <div className="space-y-1.5">
                        <RadioRow
                          checked={clusterAlg === "kmeans"}
                          onSelect={() => setClusterAlg("kmeans")}
                          title="K-Means"
                          hint="server default — k=4 with elbow curve for k ∈ {2, 3, 4, 5} on dietary (DR1I) features"
                        />
                        <RadioRow
                          disabled
                          title="Hierarchical clustering"
                          hint="agglomerative clustering on dietary features"
                          tooltip="Coming soon"
                          soon
                        />
                        <RadioRow
                          disabled
                          title="DBSCAN"
                          hint="density-based clusters without fixed k"
                          tooltip="Coming soon"
                          soon
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
                        Visualisation projection
                      </div>
                      <div className="space-y-1.5">
                        <RadioRow
                          checked={dimRed === "pca"}
                          onSelect={() => setDimRed("pca")}
                          title="PCA"
                          hint="variance curve + 2D scatter coloured by MetS"
                          disabled
                          tooltip="Coming soon — server currently generates both PCA and t-SNE plots"
                        />
                        <RadioRow
                          checked={dimRed === "tsne"}
                          onSelect={() => setDimRed("tsne")}
                          title="t-SNE"
                          hint="2D embedding on a dietary-feature sample (≤2000 rows)"
                          disabled
                          tooltip="Coming soon — server currently generates both PCA and t-SNE plots"
                        />
                        <RadioRow
                          disabled
                          title="UMAP"
                          hint="non-linear 2D projection"
                          tooltip="Coming soon"
                          soon
                        />
                      </div>
                      <p className="text-[12px] text-ink-3 mt-2">
                        Server always produces PCA variance curve, PCA scatter, K-Means cluster map,
                        and t-SNE plot — projection choice here is not applied yet.
                      </p>
                    </div>

                    <p className="text-[12.5px] text-ink-3 italic">
                      Server output: cluster assignments, per-cluster clinical means, MetS
                      prevalence by cluster, elbow curve, PCA + t-SNE figures.
                    </p>
                  </div>
                </MethodSection>
              )}
            </div>

            {/* C3:MOCK_GUARD START — block Run when VITE_USE_MOCK_API=true so we don't silently pretend AI works (owned by C3) */}
            <div className="flex flex-col items-end gap-2 mt-6">
              <button
                onClick={() => {
                  if (MOCK_API_FORCED) return;
                  advanceFrom("method", "run");
                  startRun();
                }}
                disabled={!canStartRun}
                title={
                  MOCK_API_FORCED
                    ? "Mock API mode — analysis cannot run. Set VITE_USE_MOCK_API=false to run real analyses."
                    : undefined
                }
                className="h-11 px-6 rounded-lg bg-coral text-white text-[14px] font-medium hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {runMutation.isPending ? "Submitting…" : "Run Analysis"}
              </button>
              {MOCK_API_FORCED ? (
                <span className="text-[12px] text-coral">
                  Mock API mode — analysis cannot run. Set{" "}
                  <span className="mono">VITE_USE_MOCK_API=false</span> to run real analyses.
                </span>
              ) : (
                <>
                  {!selectedDatasetId && (
                    <span className="text-[12px] text-ink-3">
                      Select a dataset in Step 1 to run.
                    </span>
                  )}
                  {USE_MOCK && (
                    <span className="text-[12px] text-ink-3">
                      Analysis runs require the API (set VITE_API_BASE_URL).
                    </span>
                  )}
                </>
              )}
              {runMutation.error && (
                <span className="text-[12px] text-ink-3">
                  Failed to start — {(runMutation.error as Error).message}
                </span>
              )}
            </div>
            {/* C3:MOCK_GUARD END */}
          </StepShell>
        )}


        {/* STEP 4 — Run (brief state before redirect to /runs/:id) */}
        {(currentStep === "run" || completed.has("run")) && (
          <section className="rounded-2xl border border-hairline bg-surface p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full flex items-center justify-center border bg-coral-tint text-coral border-coral/40">
                  {runMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : runMutation.isError ? (
                    <Info className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                </span>
                <div>
                  <h2 className="text-[15px] font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
                    {runMutation.isError
                      ? "Could not start run"
                      : runMutation.isPending
                        ? "Starting analysis…"
                        : methodSkipped
                          ? "Ready to run"
                          : "Starting analysis…"}
                  </h2>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    {runMutation.isError
                      ? (runMutation.error as Error).message
                      : runMutation.isPending
                        ? "Opening your results page. Progress updates automatically while the pipeline runs."
                        : methodSkipped
                          ? "Labels-only flow skips method selection; confirm to start the server pipeline."
                          : "Opening your results page. Progress updates automatically while the pipeline runs."}
                  </p>
                </div>
              </div>

              {/* C3:MOCK_GUARD START — labels-only / run-step retry (C2-owned panel; same MOCK_API_FORCED guard) */}
              {(runMutation.isIdle || runMutation.isError) && methodSkipped && (
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => {
                      if (MOCK_API_FORCED) return;
                      labelsRunTriggered.current = true;
                      startRun();
                    }}
                    disabled={!canStartRun}
                    title={
                      MOCK_API_FORCED
                        ? "Mock API mode — analysis cannot run. Set VITE_USE_MOCK_API=false to run real analyses."
                        : undefined
                    }
                    className="h-11 px-6 rounded-lg bg-coral text-white text-[14px] font-medium hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {runMutation.isPending ? "Submitting…" : "Run Analysis"}
                  </button>
                  {MOCK_API_FORCED ? (
                    <span className="text-[12px] text-coral">
                      Mock API mode — analysis cannot run. Set{" "}
                      <span className="mono">VITE_USE_MOCK_API=false</span> to run real analyses.
                    </span>
                  ) : (
                    !selectedDatasetId && (
                      <span className="text-[12px] text-ink-3">
                        Select a dataset in Step 1 to run.
                      </span>
                    )
                  )}
                </div>
              )}
              {/* C3:MOCK_GUARD END */}
            </div>
          </section>
        )}
      </div>

      <ProjectSaveBar
        summary={
          <>
            <span className="text-ink-3">Draft:</span>{" "}
            <span className="text-ink">{runName}</span>
            <span className="mx-2 text-ink-3">·</span>
            <span className="text-ink-3">Step</span>{" "}
            <span className="font-mono text-ink">{currentStep}</span>
            {projectId ? (
              <>
                <span className="mx-2 text-ink-3">·</span>
                <span className="text-ink-3">Project</span>{" "}
                <span className="text-ink">{project?.name || "Untitled"}</span>
              </>
            ) : null}
          </>
        }
        disabled={!projectId}
        disabledReason="Link a project to save your analysis setup"
        saving={saving}
        onSave={() => void handleSaveDraft()}
      />
    </div>
  );
}

// ---------- Small pieces ----------

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between rounded-lg border border-hairline bg-surface hover:bg-surface-hover px-3 min-h-11 h-11 text-left transition-colors"
    >
      <span className="text-[13px] text-ink">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-coral" : "bg-hairline"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[var(--shadow-xs)] transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function MethodSection({
  icon,
  title,
  subtitle,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all ${
        enabled ? "border-coral/50 bg-coral-tint/30" : "border-hairline bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              enabled ? "bg-coral text-white" : "bg-surface-hover text-ink-2"
            }`}
          >
            {icon}
          </span>
          <div>
            <h3 className="text-[15px] font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
              {title}
            </h3>
            <div className="text-[12px] text-ink-3 mt-0.5">{subtitle}</div>
          </div>
        </div>
        <span
          className={`h-5 w-5 rounded-md border flex items-center justify-center ${
            enabled ? "bg-coral border-coral" : "border-hairline bg-surface"
          }`}
        >
          {enabled && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
        </span>
      </button>
      {enabled && <div className="px-5 pb-5 pt-1 border-t border-hairline/60">{children}</div>}
    </div>
  );
}

function RadioRow({
  checked,
  onSelect,
  title,
  hint,
  disabled,
  soon,
  tooltip,
}: {
  checked?: boolean;
  onSelect?: () => void;
  title: string;
  hint?: string;
  disabled?: boolean;
  soon?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onSelect?.();
      }}
      disabled={disabled}
      title={tooltip}
      className={`w-full flex items-center gap-3 px-3 min-h-10 py-2 rounded-lg border text-left transition-colors ${
        disabled
          ? "border-dashed border-hairline bg-surface opacity-50 cursor-not-allowed"
          : checked
            ? "border-coral/50 bg-surface"
            : "border-hairline bg-surface hover:border-coral/40"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
          checked ? "border-coral" : "border-hairline"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-coral" />}
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[13px] text-ink font-medium">{title}</span>
        {hint && <span className="text-[12px] text-ink-3 leading-snug">{hint}</span>}
      </span>
      {soon && (
        <span className="ml-auto text-[10px] uppercase tracking-[0.08em] text-ink-3 border border-hairline rounded-full px-2 py-0.5 shrink-0">
          coming soon
        </span>
      )}
    </button>
  );
}

function DatasetSelector({
  datasets,
  isLoading,
  error,
  value,
  onChange,
}: {
  datasets: { id: string; name: string; row_count: number | null }[];
  isLoading: boolean;
  error: Error | null;
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = datasets.find((d) => d.id === value) ?? null;
  const label = isLoading
    ? "Loading datasets…"
    : error
      ? "Failed to load datasets"
      : selected
        ? selected.name
        : datasets.length === 0
          ? "No ready datasets"
          : "Select a dataset";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading || !!error || datasets.length === 0}
        className="w-full min-h-11 h-11 px-3 rounded-lg border border-hairline bg-surface-hover flex items-center justify-between text-[13px] disabled:opacity-60"
      >
        <span className={`mono ${selected ? "text-ink" : "text-ink-3"}`}>{label}</span>
        <ChevronDown className={`h-4 w-4 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !isLoading && !error && datasets.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-hairline bg-surface shadow-[var(--shadow-md)] p-1">
          {datasets.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                onChange(d.id);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 text-left text-[12.5px] px-2 py-2 rounded hover:bg-surface-hover ${
                d.id === value ? "text-coral" : "text-ink"
              }`}
            >
              <span className="mono truncate">{d.name}</span>
              <span className="text-[11px] text-ink-3 tabular shrink-0">
                {d.row_count != null ? `${d.row_count.toLocaleString()} rows` : "—"}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-1 text-[12px] text-ink-3">Failed to load — {error.message}</p>
      )}
    </div>
  );
}



