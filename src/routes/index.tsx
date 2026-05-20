import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import {
  FileText,
  SquareArrowOutUpRight,
  Copy,
  Archive,
} from "lucide-react";
import { FilePlusIcon, ShapesIcon, CodesandboxIcon } from "@/components/brand-icons";
import { supabase } from "@/integrations/supabase/client";
import lotusMark from "@/assets/logo_lotus.png";

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
      className="group relative flex flex-col gap-4 rounded-2xl bg-surface border border-hairline p-5 hover:bg-highlight transition-colors overflow-hidden"
      style={{ boxShadow: "var(--shadow-depth)" }}
    >
      <div className="flex items-center justify-center h-10 w-10 text-coral">
        <Icon size={36} strokeWidth={3} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[15px] font-semibold text-ink leading-tight">{label}</div>
        <div className="text-[12.5px] text-ink-2 leading-snug">{desc}</div>
      </div>
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

function SkeletonRow({ last }: { last?: boolean }) {
  return (
    <div
      className={`grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-3.5 ${
        last ? "" : "border-b border-hairline"
      }`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-hairline-grey opacity-40" />
      <div className="h-3.5 rounded bg-surface-hover/60 animate-pulse" />
      <div className="h-4 w-16 rounded-full bg-surface-hover/60 animate-pulse" />
      <div className="h-3 w-12 rounded bg-surface-hover/60 animate-pulse justify-self-end" />
      <div className="h-3 w-16 rounded bg-surface-hover/60 animate-pulse justify-self-end" />
      <div className="h-3 w-14 rounded bg-surface-hover/60 animate-pulse justify-self-end" />
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
    <div className="relative">
      <div className="mx-auto max-w-[1280px] px-6 pt-10 pb-16">
        {/* Greeting */}
        <div className="mb-14 flex items-start gap-4">
          <img src={lotusMark} alt="" className="h-12 w-auto mt-1 shrink-0" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-2 font-semibold mb-2">
              Workbench
            </div>
            <h1 className="text-[44px] font-bold text-ink leading-[1.05] tracking-[-0.02em]">
              Welcome back
            </h1>
            <p className="text-[15px] text-ink-2 mt-3 max-w-[520px] leading-relaxed">
              Pick up where you left off, or start something new.
            </p>
          </div>
        </div>

        {/* Action tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
          <ActionTile icon={FilePlusIcon} label="New Dataset" desc="Import a CSV or connect a source" href="/datasets" />
          <ActionTile icon={ShapesIcon} label="New Visualisation" desc="Chart distributions and correlations" href="/visualisation" />
          <ActionTile icon={CodesandboxIcon} label="New AI Analysis" desc="Run MetS prediction, SHAP rankings, and subgroup clustering" href="/ai-analysis" />
        </div>

        {/* Recent files */}
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[22px] font-semibold text-ink tracking-tight">Recent files</h2>
            {rows.length > 0 && (
              <span className="text-[11px] text-ink-2 bg-surface border border-hairline rounded-full px-2 py-0.5 font-medium">
                {rows.length}
              </span>
            )}
          </div>
          <button className="text-[12.5px] text-ink-2 hover:text-ink transition">View all</button>
        </div>

        {/* Unified table card */}
        <div
          className="rounded-2xl bg-surface border border-hairline overflow-hidden"
          style={{ boxShadow: "var(--shadow-depth)" }}
        >
          {/* Header row */}
          <div className="grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-3 text-[10.5px] uppercase tracking-[0.14em] text-ink-2 font-semibold border-b border-hairline-strong">
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

          <div>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} last={i === 4} />
              ))}

            {!isLoading && error && (
              <div className="px-5 py-6 text-[13px] text-ink-2">
                Failed to load — {error.message}
              </div>
            )}

            {!isLoading && !error && rows.length === 0 && (
              <div className="px-5 py-6 text-[13px] text-ink-2">No datasets yet</div>
            )}

            {!isLoading && !error && rows.map((f, i) => {
              const isSelected = selected.has(f.id);
              const showCheckbox = hasSelection || isSelected;
              const isLast = i === rows.length - 1;
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
                  className={`group relative grid grid-cols-[16px_1fr_120px_100px_140px_120px] items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-surface-hover/40 transition-colors ${
                    isLast ? "" : "border-b border-hairline"
                  } ${f.archived ? "opacity-75" : ""}`}
                >
                  <span
                    className="flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowCheckbox
                      checked={isSelected}
                      onChange={() => toggleOne(f.id)}
                      ariaLabel={`Select ${f.name}`}
                    />
                  </span>

                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-coral shrink-0" strokeWidth={1.75} />
                    <span className="text-[13.5px] font-medium text-ink truncate">{f.name}</span>
                  </div>

                  <div>
                    <TypePill type={f.type} archived={f.archived} />
                  </div>

                  <span className="tabular text-[12.5px] text-ink-2 text-right">
                    {f.rows != null ? f.rows.toLocaleString() : <Em />}
                  </span>

                  <span className="tabular text-[12.5px] text-ink-2 text-right">
                    {f.prevalence != null ? `${(f.prevalence * 100).toFixed(1)}%` : <Em />}
                  </span>

                  <span className="text-[12.5px] text-ink-2 text-right">{f.modified || <Em />}</span>

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
      </div>
    </div>
  );
}
