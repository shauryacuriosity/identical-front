import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/datasets")({
  component: DatasetsPage,
});

const attrsA = ["ID","level_sugar","level_sodium","level_potassium","level_iron","level_fibre","blood_pressureH","blood_pressureL","heartRate_avg","attribute1","attribute2","attribute3","attribute4","attribute5"];
const attrsB = ["SEQN","WTDRD1","WTDR2D","DR1LINE","DR1DRSTZ","DR1EXMER","DR1LANG","DR1MNRSP","DR1EXMER"];

const joinOptions = ["Inner Join", "Left Join", "Right Join", "Outer Join", "Cross Join"];
const aggOptions = ["Sum", "Mean", "Median", "Count", "Min / Max"];
const sortOptions = ["Ascending", "Descending", "Alphabetical", "Reverse Alpha", "Custom Order"];
const filterOptions = ["Equals", "Contains", "Greater than", "Less than", "Between"];

function Checkbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer text-sm">
      <span className="h-4 w-4 rounded-[4px] border border-foreground/40 bg-card/60" />
      <span>{label}</span>
    </label>
  );
}

function AttrGroup({ name, items }: { name: string; items: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 font-bold text-sm mb-1">
        <span className="text-[10px]">{open ? "▼" : "▶"}</span>
        {name}
      </button>
      {open && (
        <div className="pl-3">
          <Checkbox label="Select all" />
          {items.map((a) => <Checkbox key={a} label={a} />)}
        </div>
      )}
    </div>
  );
}

function Dropdown({ label, options }: { label: string; options: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="text-sm mb-1 lowercase text-foreground/80">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-card rounded-xl px-4 h-11 flex items-center justify-between shadow-[var(--shadow-soft)] text-sm"
      >
        <span className="text-foreground/70">Select</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-full bg-card rounded-xl shadow-[var(--shadow-card)] overflow-hidden border border-border/40">
          {options.map((o) => (
            <button key={o} onClick={() => setOpen(false)} className="block w-full text-left px-4 py-3 text-sm hover:bg-muted border-b border-border/40 last:border-0">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DatasetBar({ name, defaultOpen = false }: { name: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <button onClick={() => setOpen(!open)} className="w-full bg-card rounded-2xl px-6 h-16 flex items-center justify-between shadow-[var(--shadow-card)] mb-4">
      <span className="font-bold text-lg">{name}</span>
      <span className="text-foreground">▼</span>
    </button>
  );
}

function DatasetsPage() {
  return (
    <div className="flex gap-5">
      {/* Sidebar */}
      <aside className="w-64 bg-card/60 rounded-2xl p-4 shadow-[var(--shadow-card)] self-start max-h-[calc(100vh-160px)] overflow-y-auto">
        <h2 className="font-bold text-lg mb-3">Attributes</h2>
        <AttrGroup name="Dataset_A.csv" items={attrsA} />
        <AttrGroup name="Dataset_B.csv" items={attrsB} />
      </aside>

      {/* Main */}
      <section className="flex-1 flex flex-col">
        <DatasetBar name="Dataset_A.csv" />
        <DatasetBar name="Dataset_B.csv" />

        <div className="bg-card/60 rounded-2xl p-5 shadow-[var(--shadow-card)] flex-1 flex flex-col">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Dropdown label="join by" options={joinOptions} />
            <Dropdown label="aggregate by" options={aggOptions} />
            <Dropdown label="sort by" options={sortOptions} />
            <Dropdown label="filter by" options={filterOptions} />
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <p className="text-foreground/60 italic">preview of resulting table</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="bg-card rounded-xl px-8 py-2.5 font-semibold shadow-[var(--shadow-soft)]">Save</button>
            <button className="bg-card rounded-xl px-8 py-2.5 font-semibold shadow-[var(--shadow-soft)]">Export</button>
          </div>
        </div>
      </section>
    </div>
  );
}
