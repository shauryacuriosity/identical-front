import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FilePlus,
  Shapes,
  Box,
  FileText,
  SquareArrowOutUpRight,
  Copy,
  Archive,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type FileType = "Dataset" | "Analysis" | "Visualisation";

type Recent = {
  name: string;
  type: FileType;
  rows: number;
  prevalence: number | null;
  modified: string;
  archived?: boolean;
};

const RECENT: Recent[] = [
  { name: "Dataset_A_dietary.csv",     type: "Dataset",       rows: 2431, prevalence: 23.4, modified: "2h ago" },
  { name: "nhanes_bp_2023.csv",        type: "Dataset",       rows: 2060, prevalence: null, modified: "yesterday" },
  { name: "MetS_risk_run_2025-05",     type: "Analysis",      rows: 1847, prevalence: 23.4, modified: "yesterday" },
  { name: "Fibre intake distribution", type: "Visualisation", rows: 2431, prevalence: null, modified: "yesterday" },
  { name: "cohort_baseline.csv",       type: "Dataset",       rows: 2873, prevalence: 19.1, modified: "3 days ago" },
  { name: "lab_results_q3.csv",        type: "Dataset",       rows: 3686, prevalence: null, modified: "last week", archived: true },
  { name: "demographics.csv",          type: "Dataset",       rows: 4499, prevalence: null, modified: "May 2",     archived: true },
];

function ActionTile({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex flex-col items-center justify-center gap-4 rounded-2xl bg-surface py-10 px-6 hover:-translate-y-0.5 transition-transform duration-150"
      style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
    >
      <Icon className="h-10 w-10 text-ink" strokeWidth={1.5} />
      <div className="text-[15px] font-bold text-ink text-center">{label}</div>
    </Link>
  );
}

function TypePill({ type, archived }: { type: FileType; archived?: boolean }) {
  if (archived) {
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-medium tracking-wide bg-surface-hover text-ink-2 border border-hairline-grey">
        Archived
      </span>
    );
  }
  const styles: Record<FileType, React.CSSProperties> = {
    Dataset: { backgroundColor: "color-mix(in oklab, var(--coral) 22%, var(--bg-surface))", color: "var(--text-primary)" },
    Analysis: {
      backgroundColor: "color-mix(in oklab, var(--data-sage) 20%, var(--bg-surface))",
      color: "color-mix(in oklab, var(--data-sage) 60%, var(--ink))",
    },
    Visualisation: {
      backgroundColor: "color-mix(in oklab, var(--data-ochre) 22%, var(--bg-surface))",
      color: "color-mix(in oklab, var(--data-ochre) 55%, var(--ink))",
    },
  };
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-medium tracking-wide border border-transparent"
      style={styles[type]}
    >
      {type}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        active ? "bg-hairline-grey" : "bg-hairline-grey opacity-50"
      }`}
    />
  );
}

function RowAction({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      title={label}
      className="h-7 w-7 rounded-md flex items-center justify-center text-ink-2 hover:text-coral hover:bg-surface-hover/40 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}

function Index() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-6 pb-16">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight text-ink">Welcome back</h1>
        <p className="text-[13.5px] text-ink-2 mt-1">Pick up where you left off, or start something new.</p>
      </div>

      {/* Action tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 max-w-[840px] mx-auto">
        <ActionTile icon={FilePlus} label="New Dataset" desc="Import a CSV or connect a source" href="/datasets" />
        <ActionTile icon={Shapes} label="New Visualisation" desc="Chart distributions and correlations" href="/visualisation" />
        <ActionTile icon={Box} label="New AI Analysis" desc="Run MetS prediction, SHAP rankings, and subgroup clustering" href="/ai-analysis" />
      </div>

      {/* Recent files */}
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[20px] text-ink">Recent files</h2>
        <button className="text-[12.5px] text-ink-2 hover:text-ink transition">View all</button>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-2 text-[10.5px] uppercase tracking-[0.12em] text-ink-2">
        <span />
        <span>Name</span>
        <span>Type</span>
        <span className="text-right tabular">Rows</span>
        <span className="text-right">MetS prevalence</span>
        <span className="text-right">Modified</span>
      </div>

      <div className="flex flex-col gap-2">
        {RECENT.map((f) => (
          <div
            key={f.name}
            className={`group relative grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-4 rounded-xl bg-surface cursor-pointer hover:-translate-y-px transition-transform duration-150 ${
              f.archived ? "opacity-75" : ""
            }`}
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
          >
            <StatusDot active={!f.archived} />

            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-ink-2 shrink-0" strokeWidth={1.75} />
              <span className="text-[13.5px] font-medium text-ink truncate">{f.name}</span>
            </div>

            <div>
              <TypePill type={f.type} archived={f.archived} />
            </div>

            <span className="tabular text-[12.5px] text-ink-2 text-right">
              {f.rows.toLocaleString()}
            </span>

            <span className="tabular text-[12.5px] text-ink-2 text-right">
              {f.prevalence != null ? `${f.prevalence.toFixed(1)}%` : <span className="text-ink-2 opacity-50">—</span>}
            </span>

            <span className="text-[12.5px] text-ink-2 text-right">{f.modified}</span>

            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 rounded-lg bg-surface border border-hairline-grey opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150"
              style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
            >
              <RowAction icon={SquareArrowOutUpRight} label="Open" />
              <RowAction icon={Copy} label="Duplicate" />
              <RowAction icon={Archive} label="Archive" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
