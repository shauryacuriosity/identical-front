import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/ai-analysis")({
  component: AiAnalysisPage,
});

// ---------- Mock data ----------

type Confidence = "auto" | "review" | "needs" | "manual" | "unmapped";

type MappingSuggestion = {
  field: string;
  target: string; // canonical name we need
  column: string | null; // mapped dataset column
  score: number | null;
};

const CLINICAL: MappingSuggestion[] = [
  { field: "Waist circumference", target: "waist_circ", column: "waist_circ", score: 0.94 },
  { field: "Triglycerides", target: "trig_mg_dl", column: "trig_mg_dl", score: 0.89 },
  { field: "HDL Cholesterol", target: "hdl_chol", column: "hdl_chol", score: 0.91 },
  { field: "Systolic BP", target: "bp_sys", column: "bp_sys", score: 0.96 },
  { field: "Diastolic BP", target: "bp_dia", column: "bp_dia", score: 0.96 },
  { field: "Fasting Glucose", target: "glucose_fasting", column: "glucose_fasting", score: 0.87 },
];

const DIETARY: MappingSuggestion[] = [
  { field: "Age", target: "age_years", column: "age_years", score: 0.98 },
  { field: "Sex", target: "sex", column: "sex", score: 0.99 },
  { field: "Dietary sodium", target: "diet_sodium_mg", column: "diet_sodium_mg", score: 0.93 },
  { field: "Dietary fibre", target: "fibre_g", column: "fibre_g", score: 0.71 },
  { field: "Added sugar", target: "added_sugar_g", column: "added_sugar_g", score: 0.88 },
  { field: "Saturated fat", target: "sat_fat_g", column: "sat_fat_g", score: 0.85 },
  { field: "Total energy", target: "kcal_total", column: "kcal_total", score: 0.97 },
];

const TOTAL_ROWS = 2431;

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
    <div className="sticky top-14 z-20 -mx-6 px-6 py-3 bg-canvas/85 backdrop-blur-md border-b border-hairline">
      <ol className="mx-auto max-w-[1280px] flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isSkipped = skipped?.has(s.key) ?? false;
          const isDone = completed.has(s.key) && !isSkipped;
          const isActive = current === s.key && !isSkipped;
          const isRunStepRunning = s.key === "run" && running;
          const nextSkipped = skipped?.has(STEPS[i + 1]?.key);
          return (
            <li key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${isSkipped ? "opacity-50" : ""}`}>
                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] tabular border transition-colors ${
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
                  className={`text-[12.5px] font-medium ${
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
  onChange,
}: {
  row: MappingSuggestion;
  onChange: (column: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  // Mock dataset columns to choose from
  const columns = useMemo(
    () => [
      "waist_circ", "trig_mg_dl", "hdl_chol", "bp_sys", "bp_dia", "glucose_fasting",
      "age_years", "sex", "diet_sodium_mg", "fibre_g", "added_sugar_g", "sat_fat_g",
      "kcal_total", "SEQN", "RIDAGEYR", "DR1TKCAL",
    ],
    [],
  );
  return (
    <div className="grid grid-cols-[1fr_16px_1fr_auto] items-center gap-3 py-2.5 border-b border-hairline/60 last:border-b-0">
      <span className="text-[13.5px] text-ink font-medium">{row.field}</span>
      <ArrowRight className="h-3.5 w-3.5 text-ink-3" />
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`mono inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] border transition-colors ${
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
      {state === "active" && (
        <div className="px-6 pb-6 pt-1 border-t border-hairline/60">{children}</div>
      )}
    </section>
  );
}

// ---------- Page ----------

function AiAnalysisPage() {
  const navigate = useNavigate();
  const [runName, setRunName] = useState("Untitled run");
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
      const { data, error } = await supabase
        .from("datasets")
        .select("id,name,row_count,status,archived,uploaded_at")
        .eq("archived", false)
        .eq("status", "ready")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatasetOption[];
    },
  });
  const selectedDataset = datasetsQ.data?.find((d) => d.id === selectedDatasetId) ?? null;

  const [clinical, setClinical] = useState(CLINICAL);
  const [dietary, setDietary] = useState(DIETARY);

  const [ageMin, setAgeMin] = useState(20);
  const [ageMax, setAgeMax] = useState(65);
  const [sex, setSex] = useState<"All" | "Female" | "Male">("All");
  const [excludePregnant, setExcludePregnant] = useState(true);
  const [requireComplete, setRequireComplete] = useState(true);

  // Prediction section
  const [predictOn, setPredictOn] = useState(true);
  const [predictModel, setPredictModel] = useState<"xgb" | "logreg" | "both">("xgb");

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

  // Run state
  const RUN_STEPS = useMemo(() => {
    const steps: string[] = ["Computing MetS labels…", "Filtering cohort…"];
    if (!methodSkipped) {
      if (showPredict && predictOn) {
        if (predictModel === "xgb") steps.push("Training XGBoost…");
        else if (predictModel === "logreg") steps.push("Fitting Logistic Regression…");
        else steps.push("Training XGBoost + Logistic Regression…");
        steps.push("Computing SHAP values…");
      }
      if (showSubgroup && subgroupOn) steps.push("Running K-Means clustering…");
    } else {
      steps.push("Writing labelled dataset…");
    }
    return steps;
  }, [methodSkipped, showPredict, predictOn, predictModel, showSubgroup, subgroupOn]);

  const [runProgress, setRunProgress] = useState(-1); // -1 = not started, 0 = submitting (then navigation occurs)
  const runStarted = runProgress >= 0;

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
      return data as { id: string };
    },
    onSuccess: (data) => {
      navigate({ to: "/runs/$runId", params: { runId: data.id } });
    },
  });
  const runComplete = false; // navigation occurs on success; panel only shows submitting state


  // Derived cohort numbers
  const cohort = useMemo(() => {
    const ageBreadth = (ageMax - ageMin) / 100;
    const sexFactor = sex === "All" ? 1 : 0.51;
    const pregFactor = excludePregnant ? 0.96 : 1;
    const completeFactor = requireComplete ? 0.92 : 1;
    const included = Math.round(TOTAL_ROWS * ageBreadth * sexFactor * pregFactor * completeFactor);
    const pct = (included / TOTAL_ROWS) * 100;
    const prevalence = 18 + (ageMin + ageMax) / 20; // mock
    const meanAge = (ageMin + ageMax) / 2;
    return {
      included,
      pct,
      prevalence: Math.min(prevalence, 38),
      meanAge,
    };
  }, [ageMin, ageMax, sex, excludePregnant, requireComplete]);

  const stepState = (key: StepKey): "locked" | "active" | "complete" => {
    if (completed.has(key)) return "complete";
    if (currentStep === key) return "active";
    return "locked";
  };

  const cohortSummary = `${cohort.included.toLocaleString()} of ${TOTAL_ROWS.toLocaleString()} rows · age ${ageMin}–${ageMax} · ${sex === "All" ? "all sexes" : sex} · ${excludePregnant ? "pregnant excluded" : "pregnant included"}`;

  const predictSummary = (() => {
    if (!showPredict || !predictOn) return null;
    if (predictModel === "xgb") return "XGBoost";
    if (predictModel === "logreg") return "Logistic Regression";
    return "XGBoost + LogReg";
  })();
  const subgroupSummary = (() => {
    if (!showSubgroup || !subgroupOn) return null;
    return `K-Means (k=4 elbow, ${dimRed.toUpperCase()})`;
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
      setRunProgress(0);
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
    setRunProgress(-1);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-24">
      {/* Breadcrumb */}
      <div className="pt-6 pb-3 flex items-center gap-2 text-[13px] text-ink-2">
        <span>Analysis</span>
        <span className="text-ink-3">·</span>
        {editingName ? (
          <input
            autoFocus
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="bg-transparent border-b border-coral/50 text-ink focus:outline-none px-0.5"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-ink hover:text-coral transition-colors"
          >
            {runName}
          </button>
        )}
      </div>

      <StepIndicator current={currentStep} completed={completed} running={runStarted && !runComplete} skipped={skipped} />

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
                    ["full", "Full analysis", "predict + discover"],
                    ["predict", "Prediction only", null],
                    ["discover", "Subgroup discovery only", null],
                    ["labels", "Generate labels only", null],
                  ] as const
                ).map(([key, label, hint]) => {
                  const active = fnMode === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFnMode(key)}
                      className={`h-7 px-3 rounded-full text-[12.5px] border transition-colors ${
                        active
                          ? "bg-coral text-white border-coral"
                          : "bg-surface border-hairline text-ink-2 hover:text-ink hover:border-coral/40"
                      }`}
                    >
                      {label}
                      {hint && (
                        <span className={`ml-1.5 text-[11px] ${active ? "text-white/75" : "text-ink-3"}`}>
                          · {hint}
                        </span>
                      )}
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
            </div>

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
                  <div className="grid grid-cols-[1fr_16px_1fr_auto] items-center gap-3 py-2.5 border-b border-hairline/60">
                    <span className="text-[13.5px] text-ink font-medium">
                      MetS label
                      <span className="ml-1.5 text-[11px] text-ink-3 font-normal">
                        (if already in your data)
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-3" />
                    <div>
                      <button
                        onClick={() =>
                          setMetsLabelCol((c) => (c ? null : "mets_label"))
                        }
                        className={`mono inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] border transition-colors ${
                          metsLabelCol
                            ? "border-hairline bg-surface-hover text-ink hover:border-coral/40"
                            : "border-dashed border-hairline text-ink-3 hover:text-ink"
                        }`}
                      >
                        {metsLabelCol ?? "Select column"}
                        <ChevronDown className="h-3 w-3 text-ink-3" />
                      </button>
                    </div>
                    <span />
                  </div>
                )}
                {clinical.map((r, i) => (
                  <MappingRow
                    key={r.target}
                    row={r}
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
                      onChange={(col) =>
                        setDietary((rows) => {
                          const next = [...rows];
                          next[i] = { ...next[i], column: col, score: null };
                          return next;
                        })
                      }
                    />
                  ))}
                  <button className="w-full py-2.5 flex items-center gap-2 text-[12.5px] text-ink-3 hover:text-coral transition-colors border-t border-hairline/60">
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

            <div className="flex justify-end">
              <button
                onClick={() => advanceFrom("map", "cohort")}
                className="h-10 px-4 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition"
              >
                Continue to Cohort →
              </button>
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
                  <div className="flex-1 relative h-6 flex items-center">
                    <div className="absolute inset-x-0 h-1 rounded-full bg-hairline" />
                    <div
                      className="absolute h-1 rounded-full bg-coral"
                      style={{ left: `${ageMin}%`, right: `${100 - ageMax}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={ageMin}
                      onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 1))}
                      className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-coral"
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={ageMax}
                      onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 1))}
                      className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-coral"
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
                      className={`h-8 px-3 rounded-full text-[12.5px] border transition-colors ${
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
                <span className="text-[14px] text-ink-3 font-sans"> of {TOTAL_ROWS.toLocaleString()} rows</span>
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
              className="h-10 px-4 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition"
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
                          checked={predictModel === "xgb"}
                          onSelect={() => setPredictModel("xgb")}
                          title="XGBoost"
                          hint="recommended — handles non-linearities and missing data well"
                        />
                        <RadioRow
                          checked={predictModel === "logreg"}
                          onSelect={() => setPredictModel("logreg")}
                          title="Logistic Regression"
                          hint="more interpretable, smaller sample sizes"
                        />
                        <RadioRow
                          checked={predictModel === "both"}
                          onSelect={() => setPredictModel("both")}
                          title="Compare both"
                          hint="runs side-by-side, shows comparative metrics"
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
                      Produces test-set AUC + sensitivity + specificity, SHAP feature ranking
                      (XGBoost), gain importance + permutation importance + coefficient odds ratios
                      depending on model, per-subject predictions.
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
                          hint="default k=4 with elbow search over [2, 3, 4, 5]"
                        />
                        <RadioRow disabled title="Hierarchical clustering — coming in v2" soon />
                        <RadioRow disabled title="DBSCAN — coming in v2" soon />
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
                          hint="variance curve + 2D plot"
                        />
                        <RadioRow
                          checked={dimRed === "tsne"}
                          onSelect={() => setDimRed("tsne")}
                          title="t-SNE"
                          hint="2D visualisation"
                        />
                        <RadioRow disabled title="UMAP — coming in v2" soon />
                      </div>
                    </div>

                    <p className="text-[12.5px] text-ink-3 italic">
                      Produces cluster profiles, 2D scatter (PCA or t-SNE), per-cluster MetS
                      prevalence.
                    </p>
                  </div>
                </MethodSection>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  advanceFrom("method", "run");
                  setRunProgress(0);
                }}
                disabled={(!predictOn || !showPredict) && (!subgroupOn || !showSubgroup)}
                className="h-11 px-6 rounded-lg bg-coral text-white text-[14px] font-medium hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Run Analysis
              </button>
            </div>
          </StepShell>
        )}


        {/* STEP 4 — Run */}
        {(currentStep === "run" || completed.has("run")) && (
          <section className="rounded-2xl border border-hairline bg-surface p-6">
            <div className="flex items-center gap-3 mb-1">
              <span
                className={`h-7 w-7 rounded-full flex items-center justify-center border ${
                  runComplete
                    ? "bg-coral text-white border-coral"
                    : "bg-coral-tint text-coral border-coral/40"
                }`}
              >
                {runComplete ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
              </span>
              <h2 className="text-[15px] font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
                {runComplete ? "Run complete" : "Running analysis…"}
              </h2>
            </div>

            <div className="mt-5 pl-10 space-y-2.5">
              {RUN_STEPS.map((label, i) => {
                const done = i < runProgress;
                const active = i === runProgress;
                return (
                  <div key={label} className="flex items-center gap-3 text-[13px]">
                    <span className="h-5 w-5 flex items-center justify-center">
                      {done ? (
                        <span className="h-5 w-5 rounded-full bg-coral/10 flex items-center justify-center">
                          <Check className="h-3 w-3 text-coral" strokeWidth={2.5} />
                        </span>
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 text-coral animate-spin" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-hairline" />
                      )}
                    </span>
                    <span className={done ? "text-ink" : active ? "text-ink" : "text-ink-3"}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 text-[12.5px] text-ink-3 pl-10">
              {runComplete
                ? "Results are ready to inspect."
                : "Training the model on your cohort. Typically under a minute for datasets this size."}
            </p>

            {runComplete && (
              <div className="mt-5 pl-10">
                <Link to="/ai-analysis/results" className="h-10 px-4 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition inline-flex items-center gap-2">
                  View Results <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
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
      className="w-full flex items-center justify-between rounded-lg border border-hairline bg-surface hover:bg-surface-hover px-3 h-10 text-left transition-colors"
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
}: {
  checked?: boolean;
  onSelect?: () => void;
  title: string;
  hint?: string;
  disabled?: boolean;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onSelect?.();
      }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg border text-left transition-colors ${
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
      <span className="text-[13px] text-ink font-medium">{title}</span>
      {hint && <span className="text-[12px] text-ink-3">· {hint}</span>}
      {soon && (
        <span className="ml-auto text-[10px] uppercase tracking-[0.08em] text-ink-3 border border-hairline rounded-full px-2 py-0.5">
          coming soon
        </span>
      )}
    </button>
  );
}


