import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import {
  FilePlus,
  Shapes,
  Box,
  FileText,
  SquareArrowOutUpRight,
  Copy,
  Archive,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function RowCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(); }}
      className={`h-[14px] w-[14px] rounded-[3px] border flex items-center justify-center transition ${
        checked || indeterminate ? "bg-coral border-coral" : "border-ink-2 hover:border-ink"
      }`}
    >
      {indeterminate ? (
        <span className="h-[2px] w-[8px] bg-white rounded-sm" />
      ) : checked ? (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white">
          <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      <input ref={ref} type="checkbox" className="sr-only" readOnly checked={checked} />
    </button>
  );
}

type FileType = "Dataset" | "Analysis" | "Visualisation";

type Recent = {
  id: string;
  name: string;
  type: FileType;
  rows: number | null;
  prevalence: number | null;
  modified: string;
  archived?: boolean;
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `last week`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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

function Em() {
  return <span className="text-ink-2">—</span>;
}

function SkeletonRow() {
  return (
    <div
      className="grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-4 rounded-xl bg-surface"
      style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-hairline-grey opacity-40" />
      <div className="h-3.5 rounded bg-surface-hover/70 animate-pulse" />
      <div className="h-4 w-16 rounded-full bg-surface-hover/70 animate-pulse" />
      <div className="h-3 w-12 rounded bg-surface-hover/70 animate-pulse justify-self-end" />
      <div className="h-3 w-16 rounded bg-surface-hover/70 animate-pulse justify-self-end" />
      <div className="h-3 w-14 rounded bg-surface-hover/70 animate-pulse justify-self-end" />
    </div>
  );
}

function Index() {
  type DatasetRow = {
    id: string;
    name: string;
    uploaded_at: string | null;
    row_count: number | null;
    mets_prevalence: number | null;
    archived: boolean | null;
    status: string | null;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["datasets", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasets")
        .select("id,name,uploaded_at,row_count,mets_prevalence,archived,status")
        .eq("archived", false)
        .order("uploaded_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as DatasetRow[];
    },
  });

  const rows: Recent[] = (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    type: "Dataset",
    rows: d.row_count,
    prevalence: d.mets_prevalence,
    modified: formatRelative(d.uploaded_at),
    archived: d.archived ?? false,
  }));

  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && !allChecked;
  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const hasSelection = selected.size > 0;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-6 pb-16">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight text-ink">Welcome back</h1>
        <p className="text-[13.5px] text-ink mt-1">Pick up where you left off, or start something new.</p>
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
        <span className="flex items-center justify-center">
          {rows.length > 0 && (
            <RowCheckbox
              checked={allChecked}
              indeterminate={someChecked}
              onChange={toggleAll}
              ariaLabel="Select all rows"
            />
          )}
        </span>
        <span>Name</span>
        <span>Type</span>
        <span className="text-right tabular">Rows</span>
        <span className="text-right">MetS prevalence</span>
        <span className="text-right">Modified</span>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {!isLoading && error && (
          <div
            className="px-5 py-4 rounded-xl bg-surface text-[13px] text-ink-2"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
          >
            Failed to load — {error.message}
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div
            className="px-5 py-4 rounded-xl bg-surface text-[13px] text-ink-2"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
          >
            No datasets yet
          </div>
        )}

        {!isLoading && !error && rows.map((f) => {
          const isSelected = selected.has(f.id);
          const showCheckbox = hasSelection || isSelected;
          return (
            <div
              key={f.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate({ to: "/datasets", search: { datasetId: f.id } })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate({ to: "/datasets", search: { datasetId: f.id } });
                }
              }}
              className={`group relative grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-4 rounded-xl bg-surface cursor-pointer hover:-translate-y-px transition-transform duration-150 ${
                f.archived ? "opacity-75" : ""
              }`}
              style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
            >
              <span className="flex items-center justify-center relative h-[14px] w-[14px]">
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    showCheckbox ? "opacity-0" : "opacity-100 group-hover:opacity-0"
                  }`}
                >
                  <StatusDot active={!f.archived} />
                </span>
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    showCheckbox ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <RowCheckbox
                    checked={isSelected}
                    onChange={() => toggleOne(f.id)}
                    ariaLabel={`Select ${f.name}`}
                  />
                </span>
              </span>

              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-ink-2 shrink-0" strokeWidth={1.75} />
                <span className="text-[13.5px] font-medium text-ink truncate">{f.name}</span>
              </div>

              <div>
                <TypePill type={f.type} archived={f.archived} />
              </div>

              <span className="tabular text-[12.5px] text-ink text-right">
                {f.rows != null ? f.rows.toLocaleString() : <Em />}
              </span>

              <span className="tabular text-[12.5px] text-ink text-right">
                {f.prevalence != null ? `${(f.prevalence * 100).toFixed(1)}%` : <Em />}
              </span>

              <span className="text-[12.5px] text-ink text-right">{f.modified || <Em />}</span>

              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 rounded-lg bg-surface border border-hairline-grey opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
              >
                <RowAction icon={SquareArrowOutUpRight} label="Open" />
                <RowAction icon={Copy} label="Duplicate" />
                <RowAction icon={Archive} label="Archive" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
