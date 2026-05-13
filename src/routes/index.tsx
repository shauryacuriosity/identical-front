import { createFileRoute, Link } from "@tanstack/react-router";
import { FilePlus, Shapes, Box, FileText, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const recent = [
  { name: "Dataset_A_dietary.csv", active: true },
  { name: "nhanes_bp_2023.csv", active: true },
  { name: "cohort_baseline.csv", active: true },
  { name: "lab_results_q3.csv", active: false },
  { name: "demographics.csv", active: false },
];

function ActionCard({ icon: Icon, label, desc, href }: { icon: React.ElementType; label: string; desc: string; href: string }) {
  return (
    <Link
      to={href}
      className="group bg-surface rounded-xl border border-hairline p-5 flex flex-col gap-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-coral/30 hover:-translate-y-px transition-all duration-150"
    >
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-coral-tint flex items-center justify-center text-coral">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-ink-3 group-hover:text-coral transition" />
      </div>
      <div>
        <div className="font-semibold text-[15px] text-ink">{label}</div>
        <div className="text-[13px] text-ink-2 mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-coral shadow-[0_0_0_3px_var(--coral-tint)]" : "bg-ink-3/40"}`} />
  );
}

function Index() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-10 pb-16">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-[34px] leading-tight text-ink">Welcome back</h1>
        <p className="text-[14px] text-ink-2 mt-1">Pick up where you left off, or start something new.</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <ActionCard icon={FilePlus} label="New Dataset" desc="Import a CSV or connect a source" href="/datasets" />
        <ActionCard icon={Shapes} label="New Visualisation" desc="Chart distributions and correlations" href="/visualisation" />
        <ActionCard icon={Box} label="New AI Analysis" desc="Ask questions in natural language" href="/ai-analysis" />
      </div>

      {/* Recent files */}
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[18px] text-ink">Recent files</h2>
        <button className="text-[12.5px] text-ink-2 hover:text-coral transition">View all</button>
      </div>
      <div className="bg-surface rounded-xl border border-hairline shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_120px_140px] items-center gap-4 px-5 py-2.5 text-[11px] uppercase tracking-[0.1em] text-ink-3 border-b border-hairline bg-surface-hover/40">
          <span className="w-2" />
          <span>File</span>
          <span className="tabular text-right">Rows</span>
          <span className="text-right">Modified</span>
        </div>
        {recent.map((f, i) => (
          <div
            key={i}
            className={`grid grid-cols-[auto_1fr_120px_140px] items-center gap-4 px-5 py-3.5 hover:bg-surface-hover/60 transition-colors cursor-pointer ${i !== recent.length - 1 ? "border-b border-hairline/70" : ""}`}
          >
            <StatusDot active={f.active} />
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-ink-3 shrink-0" strokeWidth={1.75} />
              <span className="font-mono text-[13px] text-ink truncate">{f.name}</span>
              {!f.active && (
                <span className="text-[10.5px] uppercase tracking-wider text-ink-3 px-1.5 py-0.5 rounded border border-hairline">archived</span>
              )}
            </div>
            <span className="font-mono tabular text-[12.5px] text-ink-2 text-right">{(1247 + i * 813).toLocaleString()}</span>
            <span className="text-[12.5px] text-ink-2 text-right">{["2h ago", "yesterday", "3 days ago", "last week", "May 2"][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
