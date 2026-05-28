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
  Sparkles,
  TrendingUp,
  Tags,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as apiDatasets from "@/lib/api/datasets";
import { ensureDatasetInSupabase } from "@/lib/dataset-catalog";
import { processRun } from "@/lib/api/runs";
import { USE_MOCK } from "@/lib/api/client";
import { ProjectSaveBar } from "@/components/project-save-bar";
import { useProjects, useProject, formatRelative } from "@/lib/projects-store";
import { saveProjectWork, type AnalysisDraft } from "@/lib/project-work";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// True only when VITE_USE_MOCK_API is explicitly set (not when API URL is merely unset).
const MOCK_API_FORCED = import.meta.env.VITE_USE_MOCK_API === "true";

/** Backend always runs EDA → both models → clustering; UI choices are stored but not applied yet. */
const PIPELINE_HONESTY =
  "Every run today uses the same server pipeline (EDA, logistic + XGBoost, and clustering). Your selections are saved on the run record; selective modes are on the roadmap.";

type FnMode = "full" | "predict" | "discover" | "labels";

type ClinicalInfo = {
  title: string;
  what: string;
  why: string;
  note?: string;
};

const METHOD_CLINICAL_INFO = {
  selectMethod: {
    title: "Selecting analysis methods",
    what: "After you define the cohort, Lotus can run supervised risk models (who is likely to meet Metabolic Syndrome criteria) and/or unsupervised clustering (which dietary patterns group together).",
    why: "Population-health teams often need both angles: prediction supports screening and resource planning; clustering reveals subgroups that averages hide — for example, high MetS prevalence in one dietary cluster but not another.",
    note: "Research use only — not for individual diagnosis or treatment decisions.",
  },
  modelGroup: {
    title: "Choosing a prediction model",
    what: "Lotus can fit logistic regression (linear, coefficient-based), XGBoost (non-linear trees with SHAP explanations), or both on the same train/test split.",
    why: "Clinical collaborators often want interpretable odds ratios; reviewers expect strong ML benchmarks — comparing both supports multidisciplinary discussion without committing to one approach upfront.",
  },
  prediction: {
    title: "MetS risk prediction",
    what: "Supervised machine learning estimates each participant's probability of meeting Metabolic Syndrome (MetS) criteria using mapped clinical and dietary variables.",
    why: "Helps prioritise follow-up in research cohorts and quantify which factors (waist, lipids, glucose, diet patterns) drive risk. Outputs include calibrated scores and explainability for discussion with clinical collaborators.",
  },
  predictBoth: {
    title: "Compare logistic regression & XGBoost",
    what: "Trains two models on the same train/test split: logistic regression (linear, coefficient-based) and XGBoost (gradient-boosted trees, handles non-linear effects).",
    why: "Logistic regression is familiar and auditable for clinicians; XGBoost often improves discrimination when relationships are complex. Running both supports side-by-side comparison in reports.",
    note: "Current server default — both models always run today.",
  },
  logreg: {
    title: "Logistic regression",
    what: "A linear model for binary outcomes: log-odds of MetS ≈ weighted sum of inputs, with L2 regularisation to limit overfitting on correlated nutrition variables.",
    why: "Coefficients show direction and relative strength (e.g. waist circumference vs HDL). Preferred when interpretability and transparency matter more than marginal AUC gains.",
    note: "Single-model selection coming soon; server trains both models now.",
  },
  xgb: {
    title: "XGBoost",
    what: "An ensemble of decision trees that learns non-linear and interaction effects between diet, anthropometry, and MetS labels.",
    why: "Useful when risk is not a simple linear combination — e.g. threshold effects or feature interactions. SHAP values summarise which variables pushed predictions up or down per person.",
    note: "Single-model selection coming soon; server trains both models now.",
  },
  subgroup: {
    title: "Subgroup discovery (clustering)",
    what: "Unsupervised learning groups participants by similarity in dietary intake features, without using the MetS label to form clusters.",
    why: "Shows heterogeneity in the cohort: clusters with higher MetS prevalence may reflect distinct dietary phenotypes worth separate public-health messaging or further study.",
  },
  kmeans: {
    title: "K-Means clustering",
    what: "Splits the cohort into k groups (default k=4) so members within a cluster have similar dietary profiles; an elbow plot helps assess k=2–5.",
    why: "Fast and interpretable on large surveys (NHANES-style). Cluster means and MetS rates by cluster are easy to present to non-technical stakeholders.",
    note: "Server default — k=4 on dietary features.",
  },
  hierarchical: {
    title: "Hierarchical clustering",
    what: "Builds a tree of nested clusters by progressively merging similar dietary profiles (agglomerative approach).",
    why: "Useful when you want to see how clusters merge at different scales, not only a single k.",
    note: "Not available in this release.",
  },
  dbscan: {
    title: "DBSCAN",
    what: "Density-based clustering: finds tight groups and flags sparse points as outliers without fixing k in advance.",
    why: "Helpful when you suspect rare dietary patterns or noise; less common in survey pipelines than K-Means.",
    note: "Not available in this release.",
  },
  pca: {
    title: "PCA (principal components)",
    what: "Reduces many dietary variables to two orthogonal axes that capture the most variance, then plots participants coloured by MetS status.",
    why: "Gives a single visual summary of how dietary variation aligns with MetS in the cohort — good for exploratory talks and posters.",
    note: "Server generates PCA and t-SNE plots every run.",
  },
  tsne: {
    title: "t-SNE embedding",
    what: "A non-linear 2D map where similar dietary profiles appear closer together; typically run on a sample for large datasets.",
    why: "Can reveal local structure (subgroups, outliers) that linear PCA smooths over — useful for hypothesis generation, not for formal inference alone.",
    note: "Server generates PCA and t-SNE plots every run.",
  },
  umap: {
    title: "UMAP",
    what: "Another non-linear dimension reduction method, often preserving both local and global structure better than t-SNE on some datasets.",
    why: "Alternative embedding for exploratory visuals when comparing dietary phenotypes.",
    note: "Not available in this release.",
  },
} as const satisfies Record<string, ClinicalInfo>;

const ANALYSIS_TYPES: {
  key: FnMode;
  title: string;
  subtitle: string;
  detail: string;
  icon: React.ElementType;
  recommended?: boolean;
}[] = [
  {
    key: "full",
    title: "Complete analysis",
    subtitle: "Recommended for demos",
    detail: "Walk through mapping, cohort, methods, and a full results report.",
    icon: Sparkles,
    recommended: true,
  },
  {
    key: "predict",
    title: "MetS prediction",
    subtitle: "Risk models",
    detail: "Emphasise supervised models and SHAP-style explanations.",
    icon: TrendingUp,
  },
  {
    key: "discover",
    title: "Subgroup discovery",
    subtitle: "Patterns & clusters",
    detail: "Emphasise clustering and cohort structure in the wizard.",
    icon: Boxes,
  },
  {
    key: "labels",
    title: "Generate labels",
    subtitle: "Fast path",
    detail: "Map columns and cohort, then jump straight to run (skips method step).",
    icon: Tags,
  },
];

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
    return <span className={`${base} border-hairline text-ink-2 bg-surface-hover`}>manual</span>;
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
      style={{ backgroundColor: "var(--selection-bg-subtle)", color: "var(--coral-deep)" }}
    >
      needs review · {score}
    </span>
  );
}

// ---------- Page header & analysis type ----------

function AnalysisTypePicker({
  value,
  onChange,
}: {
  value: FnMode;
  onChange: (mode: FnMode) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {ANALYSIS_TYPES.map((opt) => {
        const active = value === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={
              "group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-coral/50 " +
              (active
                ? "border-coral bg-selection shadow-card ring-2 ring-coral/30"
                : "border-hairline bg-surface hover:border-coral/40 hover:bg-selection-subtle")
            }
          >
            {opt.recommended && (
              <span
                className={
                  "absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full " +
                  (active ? "bg-coral text-white" : "bg-coral/15 text-coral-deep")
                }
              >
                Demo pick
              </span>
            )}
            <span
              className={
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors " +
                (active ? "bg-coral text-white" : "bg-canvas text-coral-deep group-hover:bg-coral/15")
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 pr-14 sm:pr-16">
              <div
                className={
                  "text-[15px] font-semibold tracking-tight " + (active ? "text-ink" : "text-ink")
                }
              >
                {opt.title}
              </div>
              <div
                className={
                  "text-[12px] font-medium mt-0.5 " + (active ? "text-coral-deep" : "text-ink-2")
                }
              >
                {opt.subtitle}
              </div>
              <p
                className={
                  "text-[12px] leading-snug mt-2 " + (active ? "text-ink-2" : "text-ink-3")
                }
              >
                {opt.detail}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AnalysisPageHeader({
  projectId,
  projects,
  runName,
  editingName,
  onProjectChange,
  onRunNameChange,
  onRunNameFocus,
  onRunNameBlur,
  fnMode,
  onFnModeChange,
}: {
  projectId: string | undefined;
  projects: { id: string; name: string; modifiedAt: string }[];
  runName: string;
  editingName: boolean;
  onProjectChange: (id: string | undefined) => void;
  onRunNameChange: (name: string) => void;
  onRunNameFocus: () => void;
  onRunNameBlur: () => void;
  fnMode: FnMode;
  onFnModeChange: (mode: FnMode) => void;
}) {
  return (
    <header className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden mb-6">
      <div
        className="px-5 sm:px-6 pt-5 pb-5 border-b border-hairline"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--coral) 12%, var(--bg-surface)) 0%, var(--bg-surface) 55%)",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-semibold mb-1">
              Workbench
            </p>
            <h1 className="text-[26px] sm:text-[30px] font-bold text-ink tracking-tight leading-none">
              AI Analysis
            </h1>
            <p className="text-[14px] text-ink-2 mt-2 max-w-xl leading-relaxed">
              Configure a MetS run on your cohort — map fields, filter participants, then launch.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[min(100%,420px)]">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="ai-project"
                className="block text-[11px] uppercase tracking-[0.1em] text-ink-3 font-medium mb-1.5"
              >
                Project
              </label>
              <div className="relative">
                <select
                  id="ai-project"
                  value={projectId ?? ""}
                  onChange={(e) => onProjectChange(e.target.value || undefined)}
                  className="appearance-none w-full min-h-11 h-11 pl-3 pr-9 text-[13px] rounded-lg border border-hairline bg-surface text-ink hover:border-coral/40 focus:outline-none focus:border-coral focus-visible:ring-2 focus-visible:ring-coral/40"
                >
                  <option value="">Choose a project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || "Untitled project"} · {formatRelative(p.modifiedAt)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <label
                htmlFor="run-name"
                className="block text-[11px] uppercase tracking-[0.1em] text-ink-3 font-medium mb-1.5"
              >
                Run name
              </label>
              <input
                id="run-name"
                value={runName}
                onChange={(e) => onRunNameChange(e.target.value)}
                onFocus={onRunNameFocus}
                onBlur={onRunNameBlur}
                placeholder="e.g. eAsia cohort · March run"
                className={
                  "w-full min-h-11 h-11 px-3 rounded-lg border bg-surface text-ink text-[14px] font-medium focus:outline-none focus:border-coral/70 focus-visible:ring-2 focus-visible:ring-coral/40 transition-colors " +
                  (editingName ? "border-coral/60" : "border-hairline")
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5 bg-canvas/30">
        <h2 className="text-[15px] font-semibold text-ink tracking-tight">
          What do you want from this run?
        </h2>
        <p className="text-[13px] text-ink-2 mt-1 mb-4">The steps below adjust to your choice.</p>
        <AnalysisTypePicker value={fnMode} onChange={onFnModeChange} />
        <p className="mt-4 flex items-start gap-2 text-[12px] text-ink-3 leading-relaxed">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ink-3" strokeWidth={2} aria-hidden />
          <span>{PIPELINE_HONESTY}</span>
        </p>
      </div>
    </header>
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
                          ? "bg-coral text-white border-coral ring-2 ring-coral/25"
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
                    <span className="ml-1.5 text-[10px] uppercase tracking-[0.08em] text-ink-3">
                      n/a
                    </span>
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
          <ChevronDown
            className={`h-3 w-3 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
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
                  : "bg-coral text-white border-coral ring-2 ring-coral/25"
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
  const datasetsInAnyProject = useMemo(() => {
    const ids = new Set<string>();
    for (const p of projects) {
      for (const d of p.datasets) ids.add(d);
    }
    return ids;
  }, [projects]);
  const [saving, setSaving] = useState(false);
  const draftRestoredFor = useRef<string | null>(null);
  const skipAutoMapOnce = useRef(false);

  const [runName, setRunName] = useState(
    () => `Untitled run · ${new Date().toISOString().slice(0, 16)}`,
  );
  const [editingName, setEditingName] = useState(false);

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

  const visibleDatasets = useMemo(() => {
    const all = datasetsQ.data ?? [];
    if (projectId && project) {
      const allowed = new Set(project.datasets);
      return all.filter((d) => allowed.has(d.id));
    }
    return all.filter((d) => !datasetsInAnyProject.has(d.id));
  }, [datasetsQ.data, projectId, project, datasetsInAnyProject]);

  useEffect(() => {
    if (!projectId || !project) return;
    if (project.datasets.length === 0) {
      setSelectedDatasetId(null);
      return;
    }
    setSelectedDatasetId((current) =>
      current && project.datasets.includes(current) ? current : project.datasets[0],
    );
  }, [projectId, project]);

  useEffect(() => {
    if (projectId) return;
    if (selectedDatasetId && datasetsInAnyProject.has(selectedDatasetId)) {
      setSelectedDatasetId(null);
    }
  }, [projectId, selectedDatasetId, datasetsInAnyProject]);
  const selectedDataset = visibleDatasets.find((d) => d.id === selectedDatasetId) ?? null;

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
    m === "full"
      ? "full"
      : m === "predict"
        ? "prediction_only"
        : m === "discover"
          ? "subgroup_only"
          : "labels_only";

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Select a project in the header first.");
      if (!selectedDatasetId) throw new Error("Select a dataset from the linked project.");
      if (project && !project.datasets.includes(selectedDatasetId)) {
        throw new Error("That dataset is not part of the selected project.");
      }
      const datasetMeta = selectedDataset ?? {
        id: selectedDatasetId,
        name: selectedDatasetId,
        row_count: null,
      };
      await ensureDatasetInSupabase({
        id: datasetMeta.id,
        name: datasetMeta.name,
        row_count: datasetMeta.row_count,
        status: "ready",
      });
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
          prediction: showPredict && predictOn ? { model: predictModel } : null,
          subgroup:
            showSubgroup && subgroupOn ? { algorithm: clusterAlg, k: 4, projection: dimRed } : null,
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
    (methodSkipped || predictOn || subgroupOn);

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
  }, [currentStep, methodSkipped, selectedDatasetId, runMutation.isPending, runMutation.isSuccess]);

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

  const headerProjects = sortedProjects.map((p) => ({
    id: p.id,
    name: p.name || "Untitled project",
    modifiedAt: p.modifiedAt,
  }));

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 pb-24 min-w-0 overflow-x-hidden">
      <div className="pt-4 sm:pt-6">
        <AnalysisPageHeader
          projectId={projectId}
          projects={headerProjects}
          runName={runName}
          editingName={editingName}
          onProjectChange={(id) => navigate({ to: "/ai-analysis", search: { projectId: id } })}
          onRunNameChange={setRunName}
          onRunNameFocus={() => setEditingName(true)}
          onRunNameBlur={() => setEditingName(false)}
          fnMode={fnMode}
          onFnModeChange={setFnMode}
        />
      </div>

      <StepIndicator
        current={currentStep}
        completed={completed}
        running={runSubmitting}
        skipped={skipped}
      />

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
            <p className="text-[14px] text-ink-2 leading-relaxed">
              Choose a project above, then confirm how its cohort columns map to MetS clinical and
              dietary fields.
              {!projectId && (
                <span className="block mt-1 text-[13px] text-ink-3">
                  Or pick an unassigned dataset if you are not using a project yet.
                </span>
              )}
            </p>

            {/* Dataset selector — scoped to project datasets when a project is linked */}
            <div className="max-w-md">
              {!projectId && (
                <p className="mb-2 text-[12px] text-ink-3">
                  Link a project in the header for analysis on the full cohort.
                </p>
              )}
              {projectId && project && project.datasets.length === 0 && (
                <p className="mb-2 text-[12px] text-ink-3">
                  This project has no datasets yet — add files on the Datasets page first.
                </p>
              )}
              <DatasetSelector
                datasets={visibleDatasets}
                isLoading={datasetsQ.isLoading}
                error={datasetsQ.error as Error | null}
                value={selectedDatasetId}
                onChange={setSelectedDatasetId}
                emptyLabel={
                  projectId
                    ? "No datasets in this project"
                    : "No unassigned datasets available"
                }
              />
              {selectedDatasetId && previewQ.isLoading && (
                <p className="mt-2 text-[12px] text-ink-3 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Auto-mapping columns…
                </p>
              )}
              {selectedDatasetId && !previewQ.isLoading && previewQ.data && (
                <p className="mt-2 text-[12px] text-ink-3">
                  Mapped from {previewQ.data.columns.length} columns · scores reflect name + value
                  checks
                </p>
              )}
            </div>

            <div
              role="note"
              aria-label="Column mappings preview disclaimer"
              className="flex items-start gap-2.5 rounded-lg border border-dashed border-coral/40 bg-coral-tint/50 px-3 py-2.5"
            >
              <Info className="h-4 w-4 text-coral mt-0.5 shrink-0" strokeWidth={1.75} />
              <p className="text-[12.5px] text-ink leading-snug">
                <span className="font-medium">Preview only</span>
                <span className="text-ink-2">
                  {" "}
                  — column mappings are not yet applied to the ML run.
                </span>
              </p>
            </div>

            {/* Group A — MetS Clinical */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium">
                  MetS Clinical Criteria
                </h3>
                {fnMode === "predict" && metsLabelCol && (
                  <span className="text-[11px] text-ink-3 italic">
                    optional · used for verification
                  </span>
                )}
                {fnMode === "discover" && (
                  <span className="text-[11px] text-ink-3 italic">
                    optional · clustering doesn't need a label
                  </span>
                )}
              </div>
              <div
                className={`rounded-xl border border-hairline bg-canvas/40 px-4 ${
                  fnMode === "discover" || (fnMode === "predict" && metsLabelCol)
                    ? "opacity-70"
                    : ""
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
                        onClick={() => setMetsLabelCol((c) => (c ? null : "mets_label"))}
                        className={`mono inline-flex items-center gap-1.5 min-h-11 h-11 sm:min-h-0 sm:h-7 px-3 sm:px-2 rounded-md text-[12px] border transition-colors w-full sm:w-auto ${
                          metsLabelCol
                            ? "border-hairline bg-surface-hover text-ink hover:border-coral/40"
                            : "border-dashed border-hairline text-ink-3 hover:text-ink"
                        }`}
                      >
                        {metsLabelCol ?? "Select column"}
                        <ChevronDown
                          className={`h-3 w-3 text-ink-2 transition-transform ${metsLabelCol ? "rotate-180" : ""}`}
                        />
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
                        {
                          field: "New field",
                          target: `new_${Date.now()}_${rows.length}`,
                          column: null,
                          score: null,
                        },
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
                <em className="text-ink">label</em>, not to <em className="text-ink">predict</em>.
                This is the eAsia framing.
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
                <span className="text-[12px] text-ink-3">
                  Select a dataset to auto-map columns.
                </span>
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
                <label className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium">
                  Sex
                </label>
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
              <div className="text-[11px] uppercase tracking-[0.12em] text-ink-3 font-medium">
                Cohort preview
              </div>
              <div
                className="mt-3 text-[26px] text-ink tabular leading-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {cohort.included.toLocaleString()}
                <span className="text-[14px] text-ink-3 font-sans">
                  {" "}
                  of {totalRows.toLocaleString()} rows
                </span>
              </div>
              <div className="text-[12.5px] text-ink-2 tabular">
                {cohort.pct.toFixed(1)}% of dataset
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[12px] text-ink-2">Estimated MetS prevalence</span>
                  <span className="text-[12.5px] text-ink font-medium tabular">
                    {cohort.prevalence.toFixed(1)}%
                  </span>
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
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--data-sage) 70%, white)",
                      }}
                    />
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
              <div className="flex items-start gap-3 rounded-xl border border-hairline/80 bg-canvas/50 px-4 py-3">
                <p className="text-[13px] text-ink-2 leading-relaxed flex-1">
                  Choose which analyses to include. Tap{" "}
                  <Info className="inline h-3.5 w-3.5 text-coral-deep align-[-2px]" aria-hidden />{" "}
                  on each option for a clinician-oriented explanation.
                </p>
                <ClinicalInfoButton
                  info={METHOD_CLINICAL_INFO.selectMethod}
                  ariaLabel="About selecting methods"
                />
              </div>

              {/* SECTION A — Prediction */}
              {showPredict && (
                <MethodSection
                  icon={<Network className="h-5 w-5" strokeWidth={1.75} />}
                  title="Prediction"
                  subtitle="supervised · what predicts MetS in this cohort?"
                  info={METHOD_CLINICAL_INFO.prediction}
                  enabled={predictOn}
                  onToggle={() => setPredictOn((v) => !v)}
                >
                  <div className="space-y-5">
                    <div>
                      <SectionLabel label="Model" info={METHOD_CLINICAL_INFO.modelGroup} />
                      <div className="space-y-1.5">
                        <RadioRow
                          checked={predictModel === "both"}
                          onSelect={() => setPredictModel("both")}
                          title="Compare both"
                          hint="Logistic regression + XGBoost on the same cohort split"
                          info={METHOD_CLINICAL_INFO.predictBoth}
                        />
                        <RadioRow
                          checked={predictModel === "xgb"}
                          onSelect={() => setPredictModel("xgb")}
                          title="XGBoost only"
                          hint="Gradient-boosted trees with SHAP importance"
                          disabled
                          tooltip="Coming soon — server currently trains both models every run"
                          info={METHOD_CLINICAL_INFO.xgb}
                        />
                        <RadioRow
                          checked={predictModel === "logreg"}
                          onSelect={() => setPredictModel("logreg")}
                          title="Logistic Regression only"
                          hint="L2-regularised, interpretable coefficients"
                          disabled
                          tooltip="Coming soon — server currently trains both models every run"
                          info={METHOD_CLINICAL_INFO.logreg}
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
                  info={METHOD_CLINICAL_INFO.subgroup}
                  enabled={subgroupOn}
                  onToggle={() => setSubgroupOn((v) => !v)}
                >
                  <div className="space-y-5">
                    <div>
                      <SectionLabel
                        label="Clustering algorithm"
                        info={METHOD_CLINICAL_INFO.kmeans}
                      />
                      <div className="space-y-1.5">
                        <RadioRow
                          checked={clusterAlg === "kmeans"}
                          onSelect={() => setClusterAlg("kmeans")}
                          title="K-Means"
                          hint="Default k=4; elbow plot for k = 2–5 on dietary features"
                          info={METHOD_CLINICAL_INFO.kmeans}
                        />
                        <RadioRow
                          disabled
                          title="Hierarchical clustering"
                          hint="Agglomerative clustering on dietary features"
                          tooltip="Coming soon"
                          soon
                          info={METHOD_CLINICAL_INFO.hierarchical}
                        />
                        <RadioRow
                          disabled
                          title="DBSCAN"
                          hint="Density-based clusters without fixed k"
                          tooltip="Coming soon"
                          soon
                          info={METHOD_CLINICAL_INFO.dbscan}
                        />
                      </div>
                    </div>

                    <div>
                      <SectionLabel
                        label="Visualisation projection"
                        info={METHOD_CLINICAL_INFO.pca}
                      />
                      <div className="space-y-1.5">
                        <RadioRow
                          checked={dimRed === "pca"}
                          onSelect={() => setDimRed("pca")}
                          title="PCA"
                          hint="Variance curve + 2D scatter coloured by MetS"
                          disabled
                          tooltip="Coming soon — server currently generates both PCA and t-SNE plots"
                          info={METHOD_CLINICAL_INFO.pca}
                        />
                        <RadioRow
                          checked={dimRed === "tsne"}
                          onSelect={() => setDimRed("tsne")}
                          title="t-SNE"
                          hint="2D embedding on a dietary sample (≤2000 rows)"
                          disabled
                          tooltip="Coming soon — server currently generates both PCA and t-SNE plots"
                          info={METHOD_CLINICAL_INFO.tsne}
                        />
                        <RadioRow
                          disabled
                          title="UMAP"
                          hint="Non-linear 2D projection"
                          tooltip="Coming soon"
                          soon
                          info={METHOD_CLINICAL_INFO.umap}
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
          </StepShell>
        )}

        {/* STEP 4 — Run (brief state before redirect to /runs/:id) */}
        {(currentStep === "run" || completed.has("run")) && (
          <section className="rounded-2xl border border-hairline bg-surface p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center border ${
                    runMutation.isPending
                      ? "bg-coral text-white border-coral"
                      : runMutation.isError
                        ? "bg-selection-subtle text-coral-deep border-coral/50"
                        : "bg-coral text-white border-coral"
                  }`}
                >
                  {runMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : runMutation.isError ? (
                    <Info className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                </span>
                <div>
                  <h2
                    className="text-[15px] font-medium text-ink"
                    style={{ letterSpacing: "-0.01em" }}
                  >
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
            </div>
          </section>
        )}
      </div>

      <ProjectSaveBar
        summary={
          <>
            <span className="text-ink-3">Draft:</span> <span className="text-ink">{runName}</span>
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

function ClinicalInfoButton({ info, ariaLabel }: { info: ClinicalInfo; ariaLabel?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 flex h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 items-center justify-center rounded-full border border-hairline bg-surface text-coral-deep hover:bg-coral-tint hover:border-coral/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 transition-colors"
          aria-label={ariaLabel ?? `About ${info.title}`}
        >
          <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(calc(100vw-2rem),24rem)] rounded-xl border-hairline bg-surface p-0 shadow-[var(--shadow-elevated)] text-ink"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-4 py-3 border-b border-hairline bg-canvas/40">
          <p className="text-[10px] uppercase tracking-[0.12em] text-coral-deep font-semibold">
            For clinicians
          </p>
          <h4 className="text-[14px] font-semibold text-ink mt-0.5 leading-snug">{info.title}</h4>
        </div>
        <div className="px-4 py-3 space-y-3 max-h-[min(70vh,320px)] overflow-y-auto">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold">
              What it is
            </p>
            <p className="text-[13px] text-ink-2 leading-relaxed mt-1">{info.what}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold">
              Why run it
            </p>
            <p className="text-[13px] text-ink-2 leading-relaxed mt-1">{info.why}</p>
          </div>
          {info.note && (
            <p className="text-[11.5px] text-ink-3 leading-relaxed pt-2 border-t border-hairline">
              {info.note}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SectionLabel({ label, info }: { label: string; info?: ClinicalInfo }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-medium">{label}</div>
      {info && <ClinicalInfoButton info={info} ariaLabel={`About ${label}`} />}
    </div>
  );
}

function MethodSection({
  icon,
  title,
  subtitle,
  info,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  info?: ClinicalInfo;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all ${
        enabled ? "border-coral/60 bg-selection-subtle" : "border-hairline bg-surface opacity-90"
      }`}
    >
      <div className="flex items-stretch gap-1 p-3 sm:p-4 sm:pr-5">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center justify-between gap-3 min-h-11 text-left rounded-lg hover:bg-surface-hover/30 transition-colors px-2"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${
                enabled ? "bg-coral text-white" : "bg-canvas text-ink-3"
              }`}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
                {title}
              </h3>
              <div className="text-[12px] text-ink-3 mt-0.5">{subtitle}</div>
            </div>
          </div>
          <span
            className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center ${
              enabled ? "bg-coral border-coral" : "border-hairline bg-surface"
            }`}
          >
            {enabled && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
          </span>
        </button>
        {info && <ClinicalInfoButton info={info} />}
      </div>
      {enabled && <div className="px-5 pb-5 pt-0 border-t border-hairline/60">{children}</div>}
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
  info,
}: {
  checked?: boolean;
  onSelect?: () => void;
  title: string;
  hint?: string;
  disabled?: boolean;
  soon?: boolean;
  tooltip?: string;
  info?: ClinicalInfo;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-lg border pr-1 transition-colors ${
        disabled
          ? "border-dashed border-hairline bg-surface opacity-45"
          : checked
            ? "border-coral bg-selection ring-1 ring-coral/20"
            : "border-hairline bg-surface hover:bg-selection-subtle"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onSelect?.();
        }}
        disabled={disabled}
        title={tooltip}
        className={`flex-1 flex items-center gap-3 px-3 min-h-11 py-2 text-left transition-colors rounded-lg ${
          disabled ? "cursor-not-allowed" : "hover:bg-surface-hover/40"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
            checked ? "border-coral" : "border-hairline"
          }`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-coral" />}
        </span>
        <span className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-[13px] text-ink font-medium">{title}</span>
          {hint && <span className="text-[12px] text-ink-3 leading-snug">{hint}</span>}
        </span>
        {soon && (
          <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3 border border-hairline rounded-full px-2 py-0.5 shrink-0">
            coming soon
          </span>
        )}
      </button>
      {info && (
        <span className={disabled ? "opacity-40 pointer-events-none" : undefined}>
          <ClinicalInfoButton info={info} />
        </span>
      )}
    </div>
  );
}

function DatasetSelector({
  datasets,
  isLoading,
  error,
  value,
  onChange,
  emptyLabel = "No ready datasets",
}: {
  datasets: { id: string; name: string; row_count: number | null }[];
  isLoading: boolean;
  error: Error | null;
  value: string | null;
  onChange: (id: string) => void;
  emptyLabel?: string;
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
          ? emptyLabel
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
        <ChevronDown
          className={`h-4 w-4 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
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
      {error && <p className="mt-1 text-[12px] text-ink-3">Failed to load — {error.message}</p>}
    </div>
  );
}
