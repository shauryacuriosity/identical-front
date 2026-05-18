import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
}: {
  current: StepKey;
  completed: Set<StepKey>;
  running: boolean;
}) {
  return (
    <div className="sticky top-14 z-20 -mx-6 px-6 py-3 bg-canvas/85 backdrop-blur-md border-b border-hairline">
      <ol className="mx-auto max-w-[1280px] flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isDone = completed.has(s.key);
          const isActive = current === s.key;
          const isRunStepRunning = s.key === "run" && running;
          return (
            <li key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] tabular border transition-colors ${
                    isDone
                      ? "bg-coral text-white border-coral"
                      : isActive
                        ? "bg-coral-tint text-coral border-coral/40"
                        : "bg-surface text-ink-3 border-hairline"
                  }`}
                >
                  {isDone ? (
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
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-hairline" />}
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
            <div className="text-[15px] font-medium text-ink font-serif" style={{ letterSpacing: "-0.01em" }}>
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
  const [runName, setRunName] = useState("Untitled run");
  const [editingName, setEditingName] = useState(false);

  const [clinical, setClinical] = useState(CLINICAL);
  const [dietary, setDietary] = useState(DIETARY);

  const [ageMin, setAgeMin] = useState(20);
  const [ageMax, setAgeMax] = useState(65);
  const [sex, setSex] = useState<"All" | "Female" | "Male">("All");
  const [excludePregnant, setExcludePregnant] = useState(true);
  const [requireComplete, setRequireComplete] = useState(true);

  const [assocOn, setAssocOn] = useState(true);
  const [subgroupOn, setSubgroupOn] = useState(true);
  const [k, setK] = useState(4);

  const [currentStep, setCurrentStep] = useState<StepKey>("map");
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());

  // Run state
  const RUN_STEPS = [
    "Computing MetS labels…",
    "Filtering cohort…",
    "Training XGBoost…",
    "Computing SHAP values…",
    "Running K-Means clustering…",
  ];
  const [runProgress, setRunProgress] = useState(-1); // -1 = not started, n = currently on step n
  const runStarted = runProgress >= 0;
  const runComplete = runProgress >= RUN_STEPS.length;

  useEffect(() => {
    if (!runStarted || runComplete) return;
    const t = setTimeout(() => setRunProgress((p) => p + 1), 800 + Math.random() * 600);
    return () => clearTimeout(t);
  }, [runStarted, runComplete, runProgress]);

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

  const methodSummary = [
    assocOn && "Association",
    subgroupOn && `Subgroup Discovery (k=${k})`,
  ]
    .filter(Boolean)
    .join(" · ");

  const advanceFrom = (from: StepKey, to: StepKey) => {
    setCompleted((c) => new Set(c).add(from));
    setCurrentStep(to);
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

      <StepIndicator current={currentStep} completed={completed} running={runStarted && !runComplete} />

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
            <p className="text-[13.5px] text-ink-2 -mt-2">
              Confirm how your dataset columns map to the fields we need.
            </p>

            {/* Dataset selector */}
            <div className="max-w-md">
              <button className="w-full h-10 px-3 rounded-lg border border-hairline bg-surface-hover flex items-center justify-between text-[13px]">
                <span className="mono text-ink">Dataset_A_dietary.csv</span>
                <ChevronDown className="h-4 w-4 text-ink-3" />
              </button>
            </div>

            {/* Group A */}
            <div>
              <h3 className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
                MetS Clinical Criteria
              </h3>
              <div className="rounded-xl border border-hairline bg-canvas/40 px-4">
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

            {/* Group B */}
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

            {/* Annotation */}
            <div className="flex gap-3 rounded-xl bg-surface-hover border border-hairline/70 p-4">
              <Info className="h-4 w-4 text-ink-3 mt-0.5 shrink-0" />
              <p className="text-[13px] text-ink-2 leading-relaxed">
                MetS labels are computed using NCEP ATP III criteria from the clinical fields above.
                The model predicts MetS from diet and demographics only — lab values are used to{" "}
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
              <div className="mt-3 font-serif text-[26px] text-ink tabular leading-tight" style={{ letterSpacing: "-0.02em" }}>
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
              onClick={() => advanceFrom("cohort", "method")}
              className="h-10 px-4 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition"
            >
              Continue to Method →
            </button>
          </div>
        </StepShell>

        {/* STEP 3 — Method */}
        <StepShell
          index={3}
          title="Select method"
          state={stepState("method")}
          summary={methodSummary || "No methods selected"}
          onExpand={() => reopen("method")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <MethodCard
              icon={<Network className="h-5 w-5" strokeWidth={1.75} />}
              title="Association"
              description="Identify which dietary and demographic factors predict MetS in this cohort. Produces model accuracy report, ranked feature importance (SHAP), and per-subject predictions."
              selected={assocOn}
              onToggle={() => setAssocOn((v) => !v)}
            />
            <MethodCard
              icon={<Boxes className="h-5 w-5" strokeWidth={1.75} />}
              title="Subgroup Discovery"
              description="Find sub-populations with distinct dietary patterns and MetS risk. Produces cluster profiles, PCA scatter, and per-cluster prevalence."
              selected={subgroupOn}
              onToggle={() => setSubgroupOn((v) => !v)}
            >
              {subgroupOn && (
                <div className="mt-4 pt-4 border-t border-hairline/60 flex items-center gap-3">
                  <label className="text-[12px] text-ink-2">Number of clusters (k)</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setK((v) => Math.max(2, v - 1)); }}
                      className="h-7 w-7 rounded-md border border-hairline text-ink-2 hover:text-ink hover:border-coral/40"
                    >−</button>
                    <span className="mono w-8 text-center text-[13px] text-ink tabular">{k}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setK((v) => Math.min(8, v + 1)); }}
                      className="h-7 w-7 rounded-md border border-hairline text-ink-2 hover:text-ink hover:border-coral/40"
                    >+</button>
                  </div>
                </div>
              )}
            </MethodCard>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                advanceFrom("method", "run");
                setRunProgress(0);
              }}
              disabled={!assocOn && !subgroupOn}
              className="h-11 px-5 rounded-lg bg-coral text-white text-[14px] font-medium hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Run analysis
            </button>
          </div>
        </StepShell>

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
              <h2 className="text-[15px] font-medium text-ink font-serif" style={{ letterSpacing: "-0.01em" }}>
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

function MethodCard({
  icon,
  title,
  description,
  selected,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
      className={`rounded-2xl border p-5 cursor-pointer transition-all ${
        selected
          ? "border-coral/50 bg-coral-tint/40"
          : "border-hairline bg-surface hover:border-coral/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              selected ? "bg-coral text-white" : "bg-surface-hover text-ink-2"
            }`}
          >
            {icon}
          </span>
          <h3 className="text-[15px] font-medium text-ink font-serif" style={{ letterSpacing: "-0.01em" }}>
            {title}
          </h3>
        </div>
        <span
          className={`h-5 w-5 rounded-md border flex items-center justify-center ${
            selected ? "bg-coral border-coral" : "border-hairline bg-surface"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
        </span>
      </div>
      <p className="mt-3 text-[13px] text-ink-2 leading-relaxed">{description}</p>
      {children}
    </div>
  );
}
