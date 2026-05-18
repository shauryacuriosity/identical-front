import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronRight, Search, Hash, Type, Key, Save, Download, Plus, X, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/datasets")({
  component: DatasetsPage,
});

type AttrType = "id" | "num" | "cat";
type Attr = { name: string; type: AttrType };

const datasetA: Attr[] = [
  { name: "ID", type: "id" },
  { name: "level_sugar", type: "num" },
  { name: "level_sodium", type: "num" },
  { name: "level_potassium", type: "num" },
  { name: "level_iron", type: "num" },
  { name: "level_fibre", type: "num" },
  { name: "blood_pressureH", type: "num" },
  { name: "blood_pressureL", type: "num" },
  { name: "heartRate_avg", type: "num" },
  { name: "attribute1", type: "cat" },
  { name: "attribute2", type: "cat" },
];
const datasetB: Attr[] = [
  { name: "SEQN", type: "id" },
  { name: "WTDRD1", type: "num" },
  { name: "WTDR2D", type: "num" },
  { name: "DR1LINE", type: "cat" },
  { name: "DR1DRSTZ", type: "cat" },
  { name: "DR1EXMER", type: "cat" },
  { name: "DR1LANG", type: "cat" },
  { name: "DR1MNRSP", type: "cat" },
];

const joinOptions = ["Inner Join", "Left Join", "Right Join", "Outer Join", "Cross Join"];
const aggOptions = ["Sum", "Mean", "Median", "Count", "Min / Max"];
const sortOptions = ["Ascending", "Descending", "Alphabetical", "Reverse Alpha", "Custom Order"];
const filterOptions = ["Equals", "Contains", "Greater than", "Less than", "Between"];

const TypeIcon = ({ t }: { t: AttrType }) => {
  if (t === "id") return <Key className="h-3 w-3 text-data-plum" strokeWidth={2} />;
  if (t === "num") return <Hash className="h-3 w-3 text-data-slate" strokeWidth={2.25} />;
  return <Type className="h-3 w-3 text-data-sage" strokeWidth={2.25} />;
};

function Checkbox({ label, mono }: { label: string; mono?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[13px] group">
      <span
        onClick={(e) => { e.preventDefault(); setOn(!on); }}
        className={`h-[14px] w-[14px] rounded-[3px] border transition flex items-center justify-center ${on ? "bg-coral border-coral" : "border-ink-3/50 group-hover:border-ink-2"}`}
      >
        {on && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span className={mono ? "font-mono text-[12px] text-ink" : "text-ink"}>{label}</span>
    </label>
  );
}

function AttrGroup({ name, items }: { name: string; items: Attr[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[12px] font-semibold text-ink mb-1.5 w-full">
        <ChevronRight className={`h-3 w-3 text-ink-3 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="font-mono text-[12px]">{name}</span>
        <span className="ml-auto text-[10.5px] text-ink-3 font-sans font-medium tabular">{items.length}</span>
      </button>
      {open && (
        <div className="pl-4 border-l border-hairline ml-1.5">
          <Checkbox label="Select all" />
          {items.map((a) => (
            <div key={a.name} className="flex items-center gap-1.5">
              <Checkbox label={a.name} mono />
              <TypeIcon t={a.type} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Dropdown({ label, options }: { label: string; options: string[] }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState<string | null>(null);
  return (
    <div className="relative">
      <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-1.5 font-medium">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-surface rounded-lg px-3.5 h-10 flex items-center justify-between border border-hairline shadow-[var(--shadow-xs)] text-[13px] hover:border-ink-3/40 transition"
      >
        <span className={val ? "text-ink" : "text-ink-3"}>{val ?? "Select"}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full bg-surface rounded-lg shadow-[var(--shadow-lg)] overflow-hidden border border-hairline py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { setVal(o); setOpen(false); }}
              className={`block w-full text-left px-3.5 py-2 text-[13px] hover:bg-surface-hover transition ${val === o ? "text-coral" : "text-ink"}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DatasetBar({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} className="w-full bg-surface rounded-lg px-5 h-12 flex items-center justify-between border border-hairline shadow-[var(--shadow-xs)] mb-2.5 hover:border-ink-3/40 transition">
      <div className="flex items-center gap-3">
        <span className="h-1.5 w-1.5 rounded-full bg-coral" />
        <span className="font-mono text-[13.5px] text-ink">{name}</span>
        <span className="text-[11px] text-ink-3 tabular">· 2,431 rows</span>
      </div>
      <ChevronDown className={`h-4 w-4 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function DatasetsPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-6 pb-24">
      <div className="flex gap-5">
        {/* Sidebar */}
        <aside className="w-[280px] shrink-0 bg-surface rounded-xl border border-hairline shadow-[var(--shadow-sm)] p-4 self-start sticky top-[72px] max-h-[calc(100vh-90px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-ink uppercase tracking-[0.08em]">Attributes</h2>
            <span className="text-[10.5px] text-ink-3 tabular">{datasetA.length + datasetB.length}</span>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
            <input
              placeholder="Filter attributes…"
              className="w-full h-8 pl-8 pr-2 rounded-md bg-canvas border border-hairline text-[12.5px] placeholder:text-ink-3 focus:outline-none focus:border-coral/50"
            />
          </div>
          <AttrGroup name="Dataset_A.csv" items={datasetA} />
          <AttrGroup name="Dataset_B.csv" items={datasetB} />
          <div className="mt-3 pt-3 border-t border-hairline flex items-center gap-3 text-[10.5px] text-ink-3">
            <span className="flex items-center gap-1"><Key className="h-2.5 w-2.5 text-data-plum" strokeWidth={2.5} />ID</span>
            <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5 text-data-slate" strokeWidth={2.5} />Numeric</span>
            <span className="flex items-center gap-1"><Type className="h-2.5 w-2.5 text-data-sage" strokeWidth={2.5} />Category</span>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 flex flex-col min-w-0">
          <DatasetBar name="Dataset_A.csv" />
          <DatasetBar name="Dataset_B.csv" />

          <div className="bg-surface rounded-xl border border-hairline shadow-[var(--shadow-sm)] mt-3 flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-4 gap-4 p-5 border-b border-hairline">
              <Dropdown label="join by" options={joinOptions} />
              <Dropdown label="aggregate by" options={aggOptions} />
              <Dropdown label="sort by" options={sortOptions} />
              <Dropdown label="filter by" options={filterOptions} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center min-h-[340px] px-6 py-10">
              <div className="h-12 w-12 rounded-xl bg-coral-tint flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-coral" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18M9 4v16" />
                </svg>
              </div>
              <p className="text-[14.5px] text-ink font-medium">No preview yet</p>
              <p className="text-[13px] text-ink-2 mt-1 max-w-sm text-center">Pick attributes from the left and choose a join or aggregation to see your resulting table here.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-hairline bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-6 h-14 flex items-center justify-between">
          <div className="text-[12.5px] text-ink-2 tabular">
            <span className="text-ink-3">Result:</span> <span className="font-mono text-ink">— rows × — cols</span>
            <span className="mx-2 text-ink-3">·</span>
            <span className="text-ink-3">Last saved 2 min ago</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-4 rounded-lg border border-hairline bg-surface text-[13px] font-medium text-ink hover:bg-surface-hover transition flex items-center gap-1.5">
              <Save className="h-3.5 w-3.5" />Save
            </button>
            <button className="h-9 px-4 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition flex items-center gap-1.5 shadow-[var(--shadow-sm)]">
              <Download className="h-3.5 w-3.5" />Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
