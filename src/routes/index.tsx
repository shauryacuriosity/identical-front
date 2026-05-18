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
  desc,
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
      className="group h-20 px-4 rounded-xl border border-hairline bg-surface hover:border-coral/40 hover:-translate-y-px transition-all duration-150 flex items-center gap-3 overflow-hidden"
    >
      <span className="h-9 w-9 shrink-0 rounded-lg bg-coral-tint flex items-center justify-center text-coral">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-ink leading-tight">{label}</div>
        <div className="text-[12px] text-ink-3 mt-0.5 truncate opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-5 transition-all duration-150">
          {desc}
        </div>
      </div>
    </Link>
  );
}

function TypePill({ type, archived }: { type: FileType; archived?: boolean }) {
  if (archived) {
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-medium tracking-wide bg-surface-hover text-ink-3 border border-hairline">
        Archived
      </span>
    );
  }
  const styles: Record<FileType, React.CSSProperties> = {
    Dataset: { backgroundColor: "var(--coral-tint)", color: "var(--coral)" },
    Analysis: {
      backgroundColor: "color-mix(in oklab, var(--data-sage) 15%, transparent)",
      color: "color-mix(in oklab, var(--data-sage) 60%, var(--ink))",
    },
    Visualisation: {
      backgroundColor: "color-mix(in oklab, var(--data-ochre) 18%, transparent)",
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
        active ? "bg-coral shadow-[0_0_0_3px_var(--coral-tint)]" : "bg-ink-3/30"
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
      className="h-7 w-7 rounded-md flex items-center justify-center text-ink-3 hover:text-coral hover:bg-surface-hover transition-colors"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}

function Index() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8 pb-16">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-[28px] leading-tight text-ink">Welcome back</h1>
        <p className="text-[13.5px] text-ink-2 mt-1">Pick up where you left off, or start something new.</p>
      </div>

      {/* Compact action toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        <ActionTile icon={FilePlus} label="New Dataset" desc="Import a CSV or connect a source" href="/datasets" />
        <ActionTile icon={Shapes} label="New Visualisation" desc="Chart distributions and correlations" href="/visualisation" />
        <ActionTile icon={Box} label="New Analysis" desc="Run MetS prediction, SHAP rankings, and subgroup clustering" href="/ai-analysis" />
      </div>

      {/* Recent files — hero */}
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-[20px] text-ink" style={{ letterSpacing: "-0.015em" }}>
          Recent files
        </h2>
        <button className="text-[12.5px] text-ink-2 hover:text-coral transition">View all</button>
      </div>

      <div className="bg-surface rounded-xl border border-hairline overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-2.5 text-[10.5px] uppercase tracking-[0.12em] text-ink-3 border-b border-hairline bg-surface-hover/40">
          <span />
          <span>Name</span>
          <span>Type</span>
          <span className="text-right tabular">Rows</span>
          <span className="text-right">MetS prevalence</span>
          <span className="text-right">Modified</span>
        </div>

        {RECENT.map((f, i) => (
          <div
            key={f.name}
            className={`group relative grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 h-16 hover:bg-surface-hover/60 transition-colors cursor-pointer ${
              i !== RECENT.length - 1 ? "border-b border-hairline/70" : ""
            } ${f.archived ? "opacity-75" : ""}`}
          >
            <StatusDot active={!f.archived} />

            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-ink-3 shrink-0" strokeWidth={1.75} />
              <span className="mono text-[13px] text-ink truncate">{f.name}</span>
            </div>

            <div>
              <TypePill type={f.type} archived={f.archived} />
            </div>

            <span className="mono tabular text-[12.5px] text-ink-2 text-right">
              {f.rows.toLocaleString()}
            </span>

            <span className="mono tabular text-[12.5px] text-ink-2 text-right">
              {f.prevalence != null ? `${f.prevalence.toFixed(1)}%` : <span className="text-ink-3">—</span>}
            </span>

            <span className="text-[12.5px] text-ink-2 text-right">{f.modified}</span>

            {/* Hover actions, absolute so they don't disturb layout */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 rounded-lg bg-surface/95 border border-hairline shadow-[var(--shadow-sm)] opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
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
