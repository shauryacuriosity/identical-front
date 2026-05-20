import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Search, Hash, Type, Key, Save, Download, Plus, X, ArrowRight, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { parseDatasetFile, type Row } from "@/lib/dataset-import";
import { runPipeline, type Step, type StepKind } from "@/lib/pipeline-exec";
import {
  useProjects,
  useProject,
  createProject,
  renameProject,
  setProjectDatasets,
  setProjectPipeline,
} from "@/lib/projects-store";

export const Route = createFileRoute("/datasets")({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === "string" ? s.projectId : undefined,
    focusName: s.focusName === true || s.focusName === "true" ? true : undefined,
  }),
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

function Checkbox({
  label,
  mono,
  checked,
  indeterminate,
  onChange,
}: {
  label: string;
  mono?: boolean;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[13px] group">
      <span
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`h-[14px] w-[14px] rounded-[3px] border transition flex items-center justify-center ${checked || indeterminate ? "bg-coral border-coral" : "border-ink-3/50 group-hover:border-ink-2"}`}
      >
        {checked && !indeterminate && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {indeterminate && <span className="h-0.5 w-2 bg-white rounded-sm" />}
      </span>
      <span className={mono ? "font-mono text-[12px] text-ink" : "text-ink"}>{label}</span>
    </label>
  );
}

function AttrGroup({
  name,
  items,
  selected,
  onChange,
}: {
  name: string;
  items: Attr[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(true);
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.name));
  const someSelected = items.some((i) => selected.has(i.name)) && !allSelected;

  const toggleAll = (next: boolean) => {
    const copy = new Set(selected);
    if (next) for (const i of items) copy.add(i.name);
    else for (const i of items) copy.delete(i.name);
    onChange(copy);
  };
  const toggleOne = (attrName: string, next: boolean) => {
    const copy = new Set(selected);
    if (next) copy.add(attrName);
    else copy.delete(attrName);
    onChange(copy);
  };

  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[12px] font-semibold text-ink mb-1.5 w-full">
        <ChevronRight className={`h-3 w-3 text-ink-3 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="font-mono text-[12px]">{name}</span>
        <span className="ml-auto text-[10.5px] text-ink-3 font-sans font-medium tabular">{items.length}</span>
      </button>
      {open && (
        <div className="pl-4 border-l border-hairline ml-1.5">
          {items.length === 0 ? (
            <p className="text-[11.5px] text-ink-2 italic py-1">No attributes</p>
          ) : (
            <>
              <Checkbox label="Select all" checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
              {items.map((a) => (
                <div key={a.name} className="flex items-center gap-1.5">
                  <Checkbox label={a.name} mono checked={selected.has(a.name)} onChange={(n) => toggleOne(a.name, n)} />
                  <TypeIcon t={a.type} />
                </div>
              ))}
            </>
          )}
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

const ALL_DATASETS = ["Dataset_A.csv", "Dataset_B.csv"];

function DatasetBar({
  value,
  onChange,
  onRemove,
  usedNames,
  availableNames,
  rowCount,
}: {
  value: string;
  onChange: (next: string) => void;
  onRemove?: () => void;
  usedNames: string[];
  availableNames: string[];
  rowCount?: number;
}) {
  const [open, setOpen] = useState(value === "");
  const rowLabel = rowCount !== undefined ? `${rowCount.toLocaleString()} rows` : "2,431 rows";
  const isEmpty = value === "";
  return (
    <div className="relative mb-2.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-surface rounded-lg px-5 h-12 flex items-center justify-between border border-hairline shadow-[var(--shadow-xs)] hover:border-ink-3/40 transition"
      >
        <div className="flex items-center gap-3">
          <span className={`h-1.5 w-1.5 rounded-full ${isEmpty ? "bg-ink-3/40" : "bg-coral"}`} />
          {isEmpty ? (
            <span className="text-[13.5px] text-ink-2 italic">Please select a dataset</span>
          ) : (
            <>
              <span className="font-mono text-[13.5px] text-ink">{value}</span>
              <span className="text-[11px] text-ink-3 tabular">· {rowLabel}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ChevronDown className={`h-4 w-4 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
          {onRemove && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove dataset"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onRemove(); } }}
              className="ml-1 h-6 w-6 rounded-md flex items-center justify-center text-ink-3 hover:bg-surface-hover hover:text-ink transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 left-0 right-0 bg-surface rounded-lg shadow-[var(--shadow-lg)] overflow-hidden border border-hairline py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {availableNames.map((opt) => {
            const disabled = opt !== value && usedNames.includes(opt);
            return (
              <button
                key={opt}
                disabled={disabled}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`block w-full text-left px-4 py-2 font-mono text-[13px] transition ${
                  disabled
                    ? "text-ink-3/50 cursor-not-allowed"
                    : opt === value
                      ? "text-coral hover:bg-surface-hover"
                      : "text-ink hover:bg-surface-hover"
                }`}
              >
                {opt}
                {disabled && <span className="ml-2 font-sans text-[11px] text-ink-3">in use</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LocalStepKind = StepKind;

const initialPipeline: Step[] = [
  { id: "s1", kind: "from", parts: [
    { label: "FROM", value: "Dataset_A.csv", mono: true },
  ]},
  { id: "s2", kind: "join", parts: [
    { label: "JOIN", value: "Dataset_B.csv", mono: true },
    { label: "ON", value: "id", mono: true },
    { label: "USING", value: "Inner Join" },
  ]},
  { id: "s3", kind: "aggregate", parts: [
    { label: "AGGREGATE", value: "level_sugar", mono: true },
    { label: "BY", value: "Mean" },
  ]},
];

const stepAccent: Record<StepKind, string> = {
  from: "border-data-plum/35 bg-data-plum/[0.06]",
  join: "border-data-slate/35 bg-data-slate/[0.06]",
  aggregate: "border-data-ochre/40 bg-data-ochre/[0.07]",
  filter: "border-coral/35 bg-coral-tint",
  sort: "border-data-sage/40 bg-data-sage/[0.07]",
};

const addOptions: { kind: StepKind; label: string }[] = [
  { kind: "join", label: "Join" },
  { kind: "aggregate", label: "Aggregate" },
  { kind: "filter", label: "Filter" },
  { kind: "sort", label: "Sort" },
];

type PartOptions = { kind: "list"; options: string[] } | { kind: "text" };

type EditCtx = {
  slotNames: string[];
  schemaBySlot: Record<string, Attr[]>;
  steps: Step[];
};

function referencedDatasets(steps: Step[], uptoStepId: string): string[] {
  const names: string[] = [];
  for (const s of steps) {
    if (s.kind === "from") {
      const v = s.parts.find((p) => p.label === "FROM")?.value;
      if (v) names.push(v);
    } else if (s.kind === "join") {
      const v = s.parts.find((p) => p.label === "JOIN")?.value;
      if (v) names.push(v);
    }
    if (s.id === uptoStepId) break;
  }
  return Array.from(new Set(names));
}

function columnsFor(names: string[], schemaBySlot: Record<string, Attr[]>, filter?: (a: Attr) => boolean): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of names) {
    for (const a of schemaBySlot[n] ?? []) {
      if (filter && !filter(a)) continue;
      if (seen.has(a.name)) continue;
      seen.add(a.name);
      out.push(a.name);
    }
  }
  return out;
}

function optionsForPart(step: Step, partLabel: string, ctx: EditCtx): PartOptions {
  const refs = referencedDatasets(ctx.steps, step.id);
  switch (step.kind) {
    case "from":
      return { kind: "list", options: ctx.slotNames };
    case "join":
      if (partLabel === "JOIN") {
        const fromName = ctx.steps.find((s) => s.kind === "from")?.parts.find((p) => p.label === "FROM")?.value;
        return { kind: "list", options: ctx.slotNames.filter((n) => n !== fromName) };
      }
      if (partLabel === "ON") return { kind: "list", options: columnsFor(refs, ctx.schemaBySlot) };
      if (partLabel === "USING") return { kind: "list", options: joinOptions };
      break;
    case "aggregate":
      if (partLabel === "AGGREGATE")
        return { kind: "list", options: columnsFor(refs, ctx.schemaBySlot, (a) => a.type === "num") };
      if (partLabel === "BY") return { kind: "list", options: aggOptions };
      break;
    case "filter":
      if (partLabel === "FILTER") return { kind: "list", options: columnsFor(refs, ctx.schemaBySlot) };
      return { kind: "text" };
    case "sort":
      if (partLabel === "SORT") return { kind: "list", options: columnsFor(refs, ctx.schemaBySlot) };
      return { kind: "list", options: sortOptions };
  }
  return { kind: "text" };
}

function EditablePart({
  value,
  mono,
  opts,
  onChange,
  variant = "chip",
}: {
  value: string;
  mono?: boolean;
  opts: PartOptions;
  onChange: (next: string) => void;
  variant?: "chip" | "sentence";
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const btnBase =
    variant === "sentence"
      ? "px-1.5 py-0.5 rounded border border-hairline bg-surface hover:bg-surface-hover hover:border-ink-3/50 transition"
      : "px-1.5 py-0.5 rounded hover:bg-surface-hover transition";
  const txt = mono ? "font-mono text-[12.5px] text-ink" : "text-[12.5px] text-ink";

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setOpen((o) => !o);
        }}
        className={`${btnBase} ${txt}`}
      >
        {value || <span className="text-ink-3">—</span>}
      </button>
      {open && opts.kind === "list" && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] max-h-64 overflow-y-auto bg-surface rounded-lg shadow-[var(--shadow-lg)] border border-hairline py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {opts.options.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-ink-3 italic">No options</div>
          ) : (
            opts.options.map((o) => (
              <button
                key={o}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(o);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-surface-hover transition ${
                  o === value ? "text-coral" : "text-ink"
                } ${mono ? "font-mono" : ""}`}
              >
                {o}
              </button>
            ))
          )}
        </div>
      )}
      {open && opts.kind === "text" && (
        <div className="absolute left-0 top-full z-30 mt-1 bg-surface rounded-lg shadow-[var(--shadow-lg)] border border-hairline p-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange(draft);
                setOpen(false);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            onBlur={() => {
              if (draft !== value) onChange(draft);
              setOpen(false);
            }}
            className="h-7 w-32 px-2 rounded border border-hairline bg-canvas text-[12.5px] text-ink focus:outline-none focus:border-coral/60"
          />
        </div>
      )}
    </span>
  );
}

const PipelineChip = ({
  step,
  onRemove,
  pulsing,
  chipRef,
  ctx,
  onUpdatePart,
  onUpdatePartLabel,
}: {
  step: Step;
  onRemove: () => void;
  pulsing?: boolean;
  chipRef?: (el: HTMLDivElement | null) => void;
  ctx: EditCtx;
  onUpdatePart: (partIndex: number, next: string) => void;
  onUpdatePartLabel: (partIndex: number, nextLabel: string) => void;
}) => {
  const accent = stepAccent[step.kind];
  return (
    <div
      ref={chipRef}
      className={`group inline-flex items-center gap-2 h-9 pl-2.5 pr-1 rounded-md border ${accent} text-[12.5px] transition-shadow duration-300 ${pulsing ? "ring-2 ring-coral/70 ring-offset-1 ring-offset-surface" : ""}`}
    >
      {step.parts.map((p, i) => {
        const isFilterOp = step.kind === "filter" && p.label !== "FILTER";
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            {isFilterOp ? (
              <EditablePart
                value={p.label}
                opts={{ kind: "list", options: filterOptions }}
                onChange={(next) => onUpdatePartLabel(i, next)}
              />
            ) : (
              <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-ink-3">{p.label}</span>
            )}
            <EditablePart
              value={p.value}
              mono={p.mono}
              opts={optionsForPart(step, p.label, ctx)}
              onChange={(next) => onUpdatePart(i, next)}
            />
            {i < step.parts.length - 1 && <span className="text-ink-3/60">·</span>}
          </span>
        );
      })}
      {step.kind !== "from" && (
        <button onClick={onRemove} className="ml-1 h-6 w-6 rounded-md flex items-center justify-center text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-surface-hover hover:text-ink transition" aria-label="Remove step">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

function SentenceFragment({
  step,
  ctx,
  onUpdatePart,
  onUpdatePartLabel,
}: {
  step: Step;
  ctx: EditCtx;
  onUpdatePart: (partIndex: number, next: string) => void;
  onUpdatePartLabel: (partIndex: number, nextLabel: string) => void;
}) {
  const Op = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[12.5px] text-ink-2">{children}</span>
  );
  const indexOf = (label: string) => step.parts.findIndex((p) => p.label === label);
  const Edit = ({ label, mono }: { label: string; mono?: boolean }) => {
    const idx = indexOf(label);
    const p = step.parts[idx];
    if (!p) return null;
    return (
      <EditablePart
        value={p.value}
        mono={mono ?? p.mono}
        opts={optionsForPart(step, label, ctx)}
        onChange={(next) => onUpdatePart(idx, next)}
        variant="sentence"
      />
    );
  };

  switch (step.kind) {
    case "from":
      return <Edit label="FROM" mono />;
    case "join":
      return (
        <>
          <Op>+</Op>
          <Edit label="JOIN" mono />
          <Op>joined by</Op>
          <Edit label="ON" mono />
          <Edit label="USING" />
        </>
      );
    case "aggregate":
      return (
        <>
          <Op>aggregated</Op>
          <Edit label="AGGREGATE" mono />
          <Op>by</Op>
          <Edit label="BY" />
        </>
      );
    case "sort":
      return (
        <>
          <Op>sorted</Op>
          <Edit label="SORT" mono />
          <Edit label="↓" />
        </>
      );
    case "filter": {
      const opIdx = 1;
      const opPart = step.parts[opIdx];
      return (
        <>
          <Op>filtered where</Op>
          <Edit label="FILTER" mono />
          {opPart && (
            <EditablePart
              value={opPart.label}
              opts={{ kind: "list", options: filterOptions }}
              onChange={(next) => onUpdatePartLabel(opIdx, next)}
              variant="sentence"
            />
          )}
          {opPart && (
            <EditablePart
              value={opPart.value}
              mono
              opts={{ kind: "text" }}
              onChange={(next) => onUpdatePart(opIdx, next)}
              variant="sentence"
            />
          )}
        </>
      );
    }
  }
}

function PipelineSentence({
  steps,
  view,
  onViewChange,
  ctx,
  onUpdatePart,
  onUpdatePartLabel,
}: {
  steps: Step[];
  view: "compact" | "list";
  onViewChange: (v: "compact" | "list") => void;
  ctx: EditCtx;
  onUpdatePart: (stepId: string, partIndex: number, next: string) => void;
  onUpdatePartLabel: (stepId: string, partIndex: number, nextLabel: string) => void;
}) {
  const hasOps = steps.some((s) => s.kind !== "from");
  return (
    <div className="px-5 pt-4 pb-3 border-b border-hairline">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-ink-2">Pipeline</div>
        <div className="inline-flex items-center rounded-md border border-hairline bg-canvas p-0.5 text-[11px]">
          {(["compact", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`h-6 px-2.5 rounded-[5px] capitalize transition ${
                view === v ? "bg-surface text-ink shadow-[var(--shadow-xs)]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {v === "compact" ? "Compact" : "List"}
            </button>
          ))}
        </div>
      </div>
      {!hasOps ? (
        <p className="text-[13px] text-ink-2 italic">Configure the controls below to see your transformation summarised here.</p>
      ) : view === "compact" ? (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {steps.map((s, i) => {
            const prev = steps[i - 1];
            const showArrow = i > 0 && s.kind !== "join" && prev?.kind !== "from" ? true : i > 0 && s.kind !== "join" && prev?.kind === "from" ? false : false;
            return (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                {showArrow && <ArrowRight className="h-3.5 w-3.5 text-coral shrink-0" strokeWidth={2.25} />}
                <SentenceFragment
                  step={s}
                  ctx={ctx}
                  onUpdatePart={(pi, next) => onUpdatePart(s.id, pi, next)}
                  onUpdatePartLabel={(pi, next) => onUpdatePartLabel(s.id, pi, next)}
                />
              </span>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {steps.map((s) => (
            <div key={s.id} className="grid grid-cols-[80px_1fr] items-center gap-3 px-2 py-1.5 rounded-md hover:bg-canvas/60">
              <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-ink-2">{s.kind}</span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <SentenceFragment
                  step={s}
                  ctx={ctx}
                  onUpdatePart={(pi, next) => onUpdatePart(s.id, pi, next)}
                  onUpdatePartLabel={(pi, next) => onUpdatePartLabel(s.id, pi, next)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function PipelineStrip({
  slotNames,
  schemaBySlot,
  steps,
  setSteps,
}: {
  slotNames: string[];
  schemaBySlot: Record<string, Attr[]>;
  steps: Step[];
  setSteps: React.Dispatch<React.SetStateAction<Step[]>>;
}) {
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"compact" | "list">("compact");
  const chipRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const ctx: EditCtx = { slotNames, schemaBySlot, steps };

  const updatePart = (stepId: string, partIndex: number, next: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, parts: s.parts.map((p, i) => (i === partIndex ? { ...p, value: next } : p)) }
          : s,
      ),
    );
  };
  const updatePartLabel = (stepId: string, partIndex: number, nextLabel: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, parts: s.parts.map((p, i) => (i === partIndex ? { ...p, label: nextLabel } : p)) }
          : s,
      ),
    );
  };

  const addStep = (kind: StepKind) => {
    const id = `s${Date.now()}`;
    const fromName = steps.find((s) => s.kind === "from")?.parts.find((p) => p.label === "FROM")?.value;
    const otherSlot = slotNames.find((n) => n !== fromName) ?? slotNames[0] ?? "";
    const refs = [fromName, otherSlot].filter(Boolean) as string[];
    const allCols = columnsFor(refs, schemaBySlot);
    const numCols = columnsFor(refs, schemaBySlot, (a) => a.type === "num");
    const idCol = allCols.find((c) => /id|seqn/i.test(c)) ?? allCols[0] ?? "";
    const templates: Record<Exclude<StepKind, "from">, Step["parts"]> = {
      join: [{ label: "JOIN", value: otherSlot, mono: true }, { label: "ON", value: idCol, mono: true }, { label: "USING", value: "Inner Join" }],
      aggregate: [{ label: "AGGREGATE", value: numCols[0] ?? "", mono: true }, { label: "BY", value: "Mean" }],
      filter: [{ label: "FILTER", value: numCols[0] ?? allCols[0] ?? "", mono: true }, { label: "Greater than", value: "0", mono: true }],
      sort: [{ label: "SORT", value: allCols[0] ?? "", mono: true }, { label: "↓", value: "Descending" }],
    };
    setSteps([...steps, { id, kind, parts: templates[kind as Exclude<StepKind, "from">] }]);
    setAdding(false);
  };


  return (
    <>
      <PipelineSentence
        steps={steps}
        view={view}
        onViewChange={setView}
        ctx={ctx}
        onUpdatePart={updatePart}
        onUpdatePartLabel={updatePartLabel}
      />
      <div className="border-b border-hairline px-5 py-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-ink-3">Steps</span>
          <span className="text-[10.5px] text-ink-3/70 tabular">{steps.length} step{steps.length === 1 ? "" : "s"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <span key={s.id} className="inline-flex items-center gap-2">
              <PipelineChip
                step={s}
                ctx={ctx}
                chipRef={(el) => { chipRefs.current[s.id] = el; }}
                onUpdatePart={(pi, next) => updatePart(s.id, pi, next)}
                onUpdatePartLabel={(pi, next) => updatePartLabel(s.id, pi, next)}
                onRemove={() => setSteps(steps.filter((x) => x.id !== s.id))}
              />
              {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-ink-3/60 shrink-0" strokeWidth={2} />}
            </span>
          ))}

          <div className="relative">
            {!adding ? (
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-ink-3/40 text-[12.5px] text-ink-2 hover:text-ink hover:border-ink-3/70 transition"
              >
                <Plus className="h-3.5 w-3.5" />Add step
              </button>
            ) : (
              <div className="inline-flex items-center gap-1 h-9 px-1.5 rounded-md border border-hairline bg-surface shadow-[var(--shadow-sm)]">
                {addOptions.map((o) => (
                  <button
                    key={o.kind}
                    onClick={() => addStep(o.kind)}
                    className="h-7 px-2.5 rounded-[5px] text-[12px] text-ink hover:bg-surface-hover transition"
                  >
                    {o.label}
                  </button>
                ))}
                <button onClick={() => setAdding(false)} className="h-7 w-7 rounded-[5px] flex items-center justify-center text-ink-3 hover:bg-surface-hover transition" aria-label="Cancel">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


function ProjectHeader({
  projectId,
  effectiveName,
  isUntitled,
  placeholder,
}: {
  projectId: string | undefined;
  effectiveName: string;
  isUntitled: boolean;
  placeholder: string;
}) {
  const navigate = useNavigate();
  const projects = useProjects();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(effectiveName);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(isUntitled ? "" : effectiveName);
  }, [effectiveName, isUntitled, projectId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const commit = (next: string) => {
    if (!projectId) return;
    const trimmed = next.trim();
    if (trimmed === effectiveName) return;
    renameProject(projectId, trimmed);
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      {projectId ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(isUntitled ? "" : effectiveName);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={placeholder || "Untitled project"}
          className="text-[22px] leading-tight text-ink bg-transparent border border-transparent rounded-md px-2 -mx-2 py-0.5 hover:border-hairline focus:border-coral/50 focus:outline-none min-w-0 flex-1"
        />
      ) : (
        <h1 className="text-[22px] leading-tight text-ink-3 px-2 -mx-2 py-0.5 flex-1">
          No project associated
        </h1>
      )}

      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-hairline bg-surface text-[12.5px] text-ink-2 hover:text-ink hover:border-ink-3/40 transition"
        >
          {projectId ? "Switch project" : "Associate project"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-1.5 min-w-[220px] bg-surface rounded-lg shadow-[var(--shadow-lg)] border border-hairline py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {projects.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-ink-3 italic">No projects yet</div>
            )}
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/datasets", search: { projectId: p.id } });
                }}
                className={`block w-full text-left px-3 py-2 text-[12.5px] hover:bg-surface-hover transition ${
                  p.id === projectId ? "text-coral" : "text-ink"
                }`}
              >
                {p.name || "Untitled project"}
                <span className="ml-2 text-ink-3 text-[11px]">
                  {p.datasets.length} file{p.datasets.length === 1 ? "" : "s"}
                </span>
              </button>
            ))}
            <div className="border-t border-hairline my-1" />
            <button
              onClick={() => {
                setOpen(false);
                const id = createProject({ name: "" });
                navigate({ to: "/datasets", search: { projectId: id } });
              }}
              className="block w-full text-left px-3 py-2 text-[12.5px] text-ink hover:bg-surface-hover transition flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Deterministic mock-row generator for built-in demo datasets, so the preview
// table is never empty before the user imports anything real.
function mockRowsFor(slot: string, attrs: Attr[], count = 25): Row[] {
  let seed = 0;
  for (let i = 0; i < slot.length; i++) seed = (seed * 31 + slot.charCodeAt(i)) | 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) % 10000) / 10000;
  };
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const r: Row = {};
    for (const a of attrs) {
      if (a.type === "id") r[a.name] = i + 1;
      else if (a.type === "num") r[a.name] = Math.round((20 + rand() * 180) * 10) / 10;
      else r[a.name] = ["A", "B", "C", "D"][Math.floor(rand() * 4)];
    }
    rows.push(r);
  }
  return rows;
}

const datasetARows = mockRowsFor("Dataset_A.csv", datasetA);
const datasetBRows = mockRowsFor("Dataset_B.csv", datasetB);

function PreviewTable({
  result,
}: {
  result: ReturnType<typeof runPipeline>;
}) {
  if (result.columns.length === 0 || result.rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[340px] px-6 py-10">
        <div className="h-12 w-12 rounded-xl bg-coral-tint flex items-center justify-center mb-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-coral" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 10h18M9 4v16" />
          </svg>
        </div>
        <p className="text-[14.5px] text-ink font-medium">No preview yet</p>
        <p className="text-[13px] text-ink-2 mt-1 max-w-sm text-center">
          Add a dataset and configure the FROM step to see your resulting table here.
        </p>
        {result.notes.length > 0 && (
          <p className="text-[11.5px] text-ink-3 mt-3 italic">{result.notes.join(" · ")}</p>
        )}
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col min-h-[340px]">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12.5px] tabular border-collapse">
          <thead className="sticky top-0 bg-surface z-10">
            <tr className="border-b border-hairline">
              {result.columns.map((c) => (
                <th
                  key={c}
                  className="text-left font-mono font-semibold text-primary px-3 py-2 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={i} className="border-b border-hairline/40 hover:bg-canvas/40">
                {result.columns.map((c) => {
                  const v = r[c];
                  const display = v === null || v === undefined || v === "" ? "—" : String(v);
                  return (
                    <td
                      key={c}
                      className="px-3 py-1.5 text-muted-foreground font-mono whitespace-nowrap"
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-hairline px-4 py-2 text-[11.5px] text-ink-3 tabular flex items-center gap-3">
        <span>
          Showing {result.rows.length.toLocaleString()} of {result.totalRows.toLocaleString()} rows · {result.columns.length} cols
        </span>
        {result.notes.length > 0 && <span className="italic">· {result.notes.join(" · ")}</span>}
      </div>
    </div>
  );
}

const EXPORT_FORMATS = [
  { ext: "csv", label: "CSV (.csv)", disabled: false },
  { ext: "tsv", label: "TSV (.tsv)", disabled: false },
  { ext: "json", label: "JSON (.json)", disabled: false },
  { ext: "xlsx", label: "Excel (.xlsx)", disabled: false },
  { ext: "xpt", label: "SAS XPORT (.xpt)", disabled: true },
] as const;

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown, delim: string): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(delim) || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportResult(result: ReturnType<typeof runPipeline>, baseName: string, ext: string) {
  const cleanName = baseName.replace(/[^\w\- ]+/g, "").trim() || "dataset";
  const filename = `${cleanName}.${ext}`;
  if (ext === "csv" || ext === "tsv") {
    const delim = ext === "csv" ? "," : "\t";
    const lines = [result.columns.join(delim)];
    for (const r of result.rows) {
      lines.push(result.columns.map((c) => csvEscape(r[c], delim)).join(delim));
    }
    downloadBlob("\uFEFF" + lines.join("\n"), filename, `text/${ext}`);
  } else if (ext === "json") {
    downloadBlob(JSON.stringify(result.rows, null, 2), filename, "application/json");
  } else if (ext === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(result.rows, { header: result.columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  }
}

function ExportMenu({
  result,
  baseName,
}: {
  result: ReturnType<typeof runPipeline>;
  baseName: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const disabled = result.columns.length === 0 || result.rows.length === 0;
  return (
    <div className="relative" ref={wrapRef}>
      <button
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-4 rounded-lg bg-coral text-white text-[13px] font-medium hover:opacity-95 transition flex items-center gap-1.5 shadow-[var(--shadow-sm)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="h-3.5 w-3.5" />Export
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 min-w-[200px] bg-surface rounded-lg shadow-[var(--shadow-lg)] border border-hairline py-1 z-30 animate-in fade-in slide-in-from-bottom-1 duration-150">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.ext}
              disabled={f.disabled}
              onClick={() => {
                setOpen(false);
                exportResult(result, baseName, f.ext);
                toast.success(`Exported as ${f.ext.toUpperCase()}`);
              }}
              className={`block w-full text-left px-3 py-2 text-[12.5px] transition ${
                f.disabled
                  ? "text-ink-3/50 cursor-not-allowed"
                  : "text-ink hover:bg-surface-hover"
              }`}
            >
              {f.label}
              {f.disabled && <span className="ml-2 text-[10.5px] text-ink-3">not supported</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DatasetsPage() {
  const { projectId, focusName } = Route.useSearch();
  const project = useProject(projectId);
  const [attrFilter, setAttrFilter] = useState("");
  const [datasetSlots, setDatasetSlots] = useState<string[]>(
    project ? project.datasets : [],
  );
  const [importedDatasets, setImportedDatasets] = useState<
    Record<string, { attrs: Attr[]; rowCount: number; rows: Row[]; rowsAvailable: boolean }>
  >({});
  const [steps, setSteps] = useState<Step[]>(() =>
    project?.pipelineSteps && project.pipelineSteps.length > 0
      ? project.pipelineSteps
      : [{ id: "s1", kind: "from", parts: [{ label: "FROM", value: "", mono: true }] }],
  );
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, Set<string>>>({});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When switching projects, reseed slots + pipeline + selectedAttrs.
  useEffect(() => {
    if (project) {
      setDatasetSlots(project.datasets);
      if (project.pipelineSteps && project.pipelineSteps.length > 0) {
        setSteps(project.pipelineSteps);
      }
      if (project.selectedAttrs) {
        const map: Record<string, Set<string>> = {};
        for (const [k, v] of Object.entries(project.selectedAttrs)) map[k] = new Set(v);
        setSelectedAttrs(map);
      }
    } else {
      setDatasetSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Sync slot changes back to project store.
  useEffect(() => {
    if (!projectId) return;
    const current = project?.datasets ?? [];
    const same =
      current.length === datasetSlots.length &&
      current.every((v, i) => v === datasetSlots[i]);
    if (!same) setProjectDatasets(projectId, datasetSlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetSlots, projectId]);

  // Auto-name from first dataset stem.
  useEffect(() => {
    if (!projectId || !project) return;
    if (project.name.trim() !== "") return;
    const first = datasetSlots[0];
    if (!first) return;
    const dot = first.lastIndexOf(".");
    const stem = dot > 0 ? first.slice(0, dot) : first;
    renameProject(projectId, stem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetSlots, projectId, project?.name]);

  // Default-select all attrs for newly added slots; drop selections for removed slots.
  useEffect(() => {
    setSelectedAttrs((prev) => {
      const next: Record<string, Set<string>> = {};
      for (const slot of datasetSlots) {
        if (!slot) continue;
        if (prev[slot]) next[slot] = prev[slot];
        else {
          const attrs =
            slot === "Dataset_A.csv" ? datasetA
            : slot === "Dataset_B.csv" ? datasetB
            : importedDatasets[slot]?.attrs ?? [];
          next[slot] = new Set(attrs.map((a) => a.name));
        }
      }
      return next;
    });
  }, [datasetSlots, importedDatasets]);

  // Sweep stale references in pipeline steps when slots change.
  useEffect(() => {
    setSteps((prev) => {
      const slotSet = new Set(datasetSlots.filter(Boolean));
      const firstValid = datasetSlots.find(Boolean) ?? "";
      const swept = prev.map((s) => {
        if (s.kind === "from") {
          const fromVal = s.parts.find((p) => p.label === "FROM")?.value ?? "";
          if (!slotSet.has(fromVal)) {
            return {
              ...s,
              parts: s.parts.map((p) => p.label === "FROM" ? { ...p, value: firstValid } : p),
            };
          }
        } else if (s.kind === "join") {
          const joinVal = s.parts.find((p) => p.label === "JOIN")?.value ?? "";
          if (!slotSet.has(joinVal)) return null;
        }
        return s;
      });
      return swept.filter(Boolean) as Step[];
    });
  }, [datasetSlots]);

  // Persist pipeline + attr selection to project store.
  useEffect(() => {
    if (!projectId) return;
    const selObj: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(selectedAttrs)) selObj[k] = [...v];
    setProjectPipeline(projectId, steps, selObj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, selectedAttrs, projectId]);

  const q = attrFilter.trim().toLowerCase();
  const schemaBySlot: Record<string, Attr[]> = {
    "Dataset_A.csv": datasetA,
    "Dataset_B.csv": datasetB,
    ...Object.fromEntries(Object.entries(importedDatasets).map(([k, v]) => [k, v.attrs])),
  };
  const rowCountBySlot: Record<string, number | undefined> = {
    "Dataset_A.csv": datasetARows.length,
    "Dataset_B.csv": datasetBRows.length,
    ...Object.fromEntries(Object.entries(importedDatasets).map(([k, v]) => [k, v.rowCount])),
  };
  const tables: Record<string, Row[]> = useMemo(() => ({
    "Dataset_A.csv": datasetARows,
    "Dataset_B.csv": datasetBRows,
    ...Object.fromEntries(Object.entries(importedDatasets).map(([k, v]) => [k, v.rows])),
  }), [importedDatasets]);

  const availableNames = [...ALL_DATASETS, ...Object.keys(importedDatasets)];
  const groups = datasetSlots.filter(Boolean).map((slot) => {
    const base = schemaBySlot[slot] ?? [];
    const items = q ? base.filter((a) => a.name.toLowerCase().includes(q)) : base;
    return { name: slot, items };
  });
  const totalCount = groups.reduce((n, g) => n + g.items.length, 0);

  // Flatten selected columns across all slots for the executor.
  const selectedCols = useMemo(() => {
    const out = new Set<string>();
    for (const slot of datasetSlots) {
      const sel = selectedAttrs[slot];
      if (!sel) continue;
      for (const c of sel) out.add(c);
    }
    return [...out];
  }, [datasetSlots, selectedAttrs]);

  const previewResult = useMemo(
    () => runPipeline(steps, tables, selectedCols, { limit: 200 }),
    [steps, tables, selectedCols],
  );
  const fullResult = useMemo(
    () => runPipeline(steps, tables, selectedCols, { limit: Number.POSITIVE_INFINITY }),
    [steps, tables, selectedCols],
  );

  const addSlot = () => {
    if (datasetSlots.includes("")) return;
    setDatasetSlots([...datasetSlots, ""]);
  };

  const uniqueName = (base: string, taken: Set<string>) => {
    if (!taken.has(base)) return base;
    const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : "";
    let i = 1;
    while (taken.has(`${stem} (${i})${ext}`)) i++;
    return `${stem} (${i})${ext}`;
  };

  const onFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    const newEntries: Record<string, { attrs: Attr[]; rowCount: number; rows: Row[]; rowsAvailable: boolean }> = {};
    const newSlotNames: string[] = [];
    const taken = new Set<string>([...ALL_DATASETS, ...Object.keys(importedDatasets)]);
    for (const file of Array.from(files)) {
      try {
        const parsed = await parseDatasetFile(file);
        if (parsed.attrs.length === 0) throw new Error("No columns detected");
        const name = uniqueName(file.name, taken);
        taken.add(name);
        newEntries[name] = parsed;
        newSlotNames.push(name);
        toast.success(`Imported ${name}`, {
          description: `${parsed.attrs.length} columns · ${parsed.rowCount.toLocaleString()} rows`,
        });
      } catch (err) {
        toast.error(`Couldn't import ${file.name}`, {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (Object.keys(newEntries).length > 0) {
      setImportedDatasets((prev) => ({ ...prev, ...newEntries }));
      setDatasetSlots((prev) => [...prev, ...newSlotNames]);
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const firstNamedSlot = datasetSlots.find(Boolean);
  const effectiveName = project?.name?.trim()
    ? project.name
    : firstNamedSlot
      ? (() => {
          const dot = firstNamedSlot.lastIndexOf(".");
          return dot > 0 ? firstNamedSlot.slice(0, dot) : firstNamedSlot;
        })()
      : "";
  const isUntitled = !project?.name?.trim();
  const placeholder = firstNamedSlot
    ? (() => {
        const dot = firstNamedSlot.lastIndexOf(".");
        return dot > 0 ? firstNamedSlot.slice(0, dot) : firstNamedSlot;
      })()
    : "Untitled project";

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-6 pb-24">
      <ProjectHeader
        projectId={projectId}
        effectiveName={effectiveName}
        isUntitled={isUntitled}
        placeholder={placeholder}
      />

      <div className="flex gap-5">
        {/* Sidebar */}

        <aside className="w-[280px] shrink-0 bg-surface rounded-xl border border-hairline shadow-[var(--shadow-sm)] p-4 self-start sticky top-[72px] max-h-[calc(100vh-90px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-ink uppercase tracking-[0.08em]">Attributes</h2>
            <span className="text-[10.5px] text-ink-2 tabular">{totalCount}</span>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-2" />
            <input
              value={attrFilter}
              onChange={(e) => setAttrFilter(e.target.value)}
              placeholder="Filter attributes…"
              className="w-full h-8 pl-8 pr-2 rounded-md bg-canvas border border-hairline text-[12.5px] text-ink placeholder:text-ink-2 focus:outline-none focus:border-coral/50"
            />
          </div>
          {groups.map((g) => (
            <AttrGroup
              key={g.name}
              name={g.name}
              items={g.items}
              selected={selectedAttrs[g.name] ?? new Set()}
              onChange={(next) =>
                setSelectedAttrs((prev) => ({ ...prev, [g.name]: next }))
              }
            />
          ))}
          <div className="mt-3 pt-3 border-t border-hairline flex items-center gap-3 text-[10.5px] text-ink-2">
            <span className="flex items-center gap-1"><Key className="h-2.5 w-2.5 text-data-plum" strokeWidth={2.5} />ID</span>
            <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5 text-data-slate" strokeWidth={2.5} />Numeric</span>
            <span className="flex items-center gap-1"><Type className="h-2.5 w-2.5 text-data-sage" strokeWidth={2.5} />Category</span>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 flex flex-col min-w-0">
          {datasetSlots.map((name, i) => (
            <DatasetBar
              key={`${name}-${i}`}
              value={name}
              usedNames={datasetSlots}
              availableNames={availableNames}
              rowCount={rowCountBySlot[name]}
              onChange={(next) => setDatasetSlots((slots) => slots.map((s, idx) => (idx === i ? next : s)))}
              onRemove={() => setDatasetSlots((slots) => slots.filter((_, idx) => idx !== i))}
            />
          ))}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.tsv,.txt,.json,.xlsx,.xls,.xpt"
            onChange={(e) => onFilesPicked(e.target.files)}
            className="hidden"
          />
          <div className="flex gap-2.5 mb-2.5">
            <button
              onClick={addSlot}
              disabled={datasetSlots.includes("")}
              className="flex-1 h-10 rounded-lg border border-dashed border-ink-2/50 text-[12.5px] text-ink-2 hover:text-ink hover:border-ink transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-ink-2 disabled:hover:border-ink-2/50"
            >
              <Plus className="h-3.5 w-3.5" /> Add dataset
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex-1 h-10 rounded-lg border border-dashed border-ink-2/50 text-[12.5px] text-ink-2 hover:text-ink hover:border-ink transition flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
            >
              <Upload className="h-3.5 w-3.5" /> {importing ? "Importing…" : "Import file"}
            </button>
          </div>


          <div className="bg-surface rounded-xl border border-hairline shadow-[var(--shadow-sm)] mt-3 flex-1 flex flex-col overflow-hidden">
            <PipelineStrip
              slotNames={datasetSlots.filter(Boolean)}
              schemaBySlot={schemaBySlot}
              steps={steps}
              setSteps={setSteps}
            />
            <PreviewTable result={previewResult} />
          </div>
        </section>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-hairline bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-6 h-14 flex items-center justify-between">
          <div className="text-[12.5px] text-ink-2 tabular">
            <span className="text-ink-3">Result:</span>{" "}
            <span className="font-mono text-ink">
              {previewResult.totalRows.toLocaleString()} rows × {previewResult.columns.length} cols
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-4 rounded-lg border border-hairline bg-surface text-[13px] font-medium text-ink hover:bg-surface-hover transition flex items-center gap-1.5">
              <Save className="h-3.5 w-3.5" />Save
            </button>
            <ExportMenu result={fullResult} baseName={effectiveName || "dataset"} />
          </div>
        </div>
      </div>
    </div>
  );
}

