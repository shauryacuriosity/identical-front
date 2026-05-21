import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  ChevronDown,
  Download,
  Image as ImageIcon,
  Plus,
  X,
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  Box,
  Grid3x3,
  Hash,
} from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import {
  useProjects,
  setProjectCharts,
  formatRelative,
} from "@/lib/projects-store";
import * as api from "@/lib/api";
import { useDatasetTables } from "@/lib/dataset-tables";
import {
  buildChartData,
  numericColumns,
  isNumericColumn,
  toCSV,
  type ChartConfig,
  type ChartType,
  type Agg,
} from "@/lib/chart-config";

export const Route = createFileRoute("/visualisation")({
  component: VisualisationPage,
});

// Lucide doesn't export "Histogram" / "Scatter3D"; build small SVG icons inline.
function HistIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="3" y1="21" x2="21" y2="21" />
      <rect x="4" y="14" width="3" height="7" />
      <rect x="8.5" y="9" width="3" height="12" />
      <rect x="13" y="5" width="3" height="16" />
      <rect x="17.5" y="11" width="3" height="10" />
    </svg>
  );
}
function ScatterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="6" cy="17" r="1.5" />
      <circle cx="10" cy="12" r="1.5" />
      <circle cx="14" cy="14" r="1.5" />
      <circle cx="17" cy="8" r="1.5" />
      <circle cx="8" cy="7" r="1.5" />
      <circle cx="19" cy="17" r="1.5" />
    </svg>
  );
}

const CHART_TYPES: { value: ChartType; label: string; Icon: React.ElementType; desc: string }[] = [
  { value: "bar", label: "Bar", Icon: BarChart3, desc: "Compare values across categories" },
  { value: "line", label: "Line", Icon: LineIcon, desc: "Trend over an ordered axis" },
  { value: "area", label: "Area", Icon: AreaIcon, desc: "Cumulative trend or share" },
  { value: "scatter", label: "Scatter", Icon: ScatterIcon, desc: "Two numeric variables" },
  { value: "histogram", label: "Histogram", Icon: HistIcon, desc: "Distribution of a numeric column" },
  { value: "box", label: "Box plot", Icon: Box, desc: "Spread by category" },
  { value: "heatmap", label: "Heatmap", Icon: Grid3x3, desc: "Correlation across numeric columns" },
  { value: "kpi", label: "Summary KPI", Icon: Hash, desc: "One aggregated number" },
];

const PALETTE = [
  "var(--coral)",
  "var(--data-slate)",
  "var(--data-sage)",
  "var(--data-ochre)",
  "var(--data-plum)",
];

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none h-8 pl-2.5 pr-7 text-[12.5px] rounded-md border border-hairline bg-surface text-ink hover:border-coral/40 focus:outline-none focus:border-coral disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-3 pointer-events-none" />
    </div>
  );
}

function VisualisationPage() {
  const projects = useProjects();
  const tables = useDatasetTables();

  // Default to last-modified project.
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1)),
    [projects],
  );
  const [projectId, setProjectId] = useState<string | null>(null);
  useEffect(() => {
    if (!projectId && sortedProjects[0]) setProjectId(sortedProjects[0].id);
  }, [projectId, sortedProjects]);
  const project = projects.find((p) => p.id === projectId) ?? null;

  // Selected columns flattened across slots.
  const selectedCols = useMemo(() => {
    const out: string[] = [];
    for (const arr of Object.values(project?.selectedAttrs ?? {})) {
      for (const c of arr) if (!out.includes(c)) out.push(c);
    }
    return out;
  }, [project]);

  // Dataset registry signature — invalidates the query when tables change.
  const tablesSig = useMemo(
    () => Object.keys(tables).sort().map((k) => `${k}:${tables[k]?.length ?? 0}`).join("|"),
    [tables],
  );

  // Run the pipeline (full rows) for charting via the API seam.
  const pipelineQuery = useQuery({
    queryKey: ["pipeline", projectId, project?.pipelineSteps, selectedCols, tablesSig, "full"],
    queryFn: () =>
      api.pipeline.preview({
        steps: project?.pipelineSteps ?? [],
        selectedCols,
        limit: Number.POSITIVE_INFINITY,
      }),
    enabled: !!project?.pipelineSteps?.length,
    staleTime: 5_000,
  });

  const columns = pipelineQuery.data?.columns ?? [];
  const rows = pipelineQuery.data?.rows ?? [];
  const pipelineTotalRows = pipelineQuery.data?.totalRows ?? 0;
  const isPipelineLoading = pipelineQuery.isFetching && !pipelineQuery.data;
  const pipelineError = pipelineQuery.error as Error | null;

  // Builder state.
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xCol, setXCol] = useState<string>("");
  const [yCol, setYCol] = useState<string>("__count__");
  const [seriesCol, setSeriesCol] = useState<string>("");
  const [agg, setAgg] = useState<Agg>("sum");
  const [bins, setBins] = useState<number>(12);
  const [topN, setTopN] = useState<number>(10);

  // Auto-pick sensible defaults when columns first appear or project changes.
  useEffect(() => {
    if (!columns.length) {
      setXCol("");
      setYCol("__count__");
      setSeriesCol("");
      return;
    }
    if (!columns.includes(xCol)) setXCol(columns[0]);
    if (yCol !== "__count__" && !columns.includes(yCol)) setYCol("__count__");
    if (seriesCol && !columns.includes(seriesCol)) setSeriesCol("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.join("|"), projectId]);

  const numCols = useMemo(() => numericColumns(rows, columns), [rows, columns]);

  const config: ChartConfig = useMemo(
    () => ({
      id: "current",
      chartType,
      x: xCol || undefined,
      y: yCol || undefined,
      series: seriesCol || undefined,
      agg,
      bins,
      topN,
    }),
    [chartType, xCol, yCol, seriesCol, agg, bins, topN],
  );

  const built = useMemo(() => buildChartData(rows, columns, config), [rows, columns, config]);

  // Chart export refs
  const chartHostRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const exportSVG = () => {
    const svg = chartHostRef.current?.querySelector("svg");
    if (!svg) return;
    const ser = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([ser], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(URL.createObjectURL(blob), `${chartType}.svg`);
    setExportMenuOpen(false);
  };
  const exportPNG = () => {
    const svg = chartHostRef.current?.querySelector("svg");
    if (!svg) return;
    const ser = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([ser], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const w = svg.clientWidth || 800;
      const h = svg.clientHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      triggerDownload(canvas.toDataURL("image/png"), `${chartType}.png`);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    setExportMenuOpen(false);
  };
  const exportCSV = () => {
    const csv = toCSV(built.data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(URL.createObjectURL(blob), `${chartType}-data.csv`);
  };

  // Saved charts persistence
  const savedCharts = project?.charts ?? [];
  const addCurrentToProject = () => {
    if (!project) return;
    const next: ChartConfig = { ...config, id: `c${Date.now().toString(36)}` };
    setProjectCharts(project.id, [...savedCharts, next]);
  };
  const removeSaved = (id: string) => {
    if (!project) return;
    setProjectCharts(project.id, savedCharts.filter((c) => c.id !== id));
  };
  const loadSaved = (c: ChartConfig) => {
    setChartType(c.chartType);
    setXCol(c.x ?? "");
    setYCol(c.y ?? "__count__");
    setSeriesCol(c.series ?? "");
    if (c.agg) setAgg(c.agg);
    if (c.bins) setBins(c.bins);
    if (c.topN) setTopN(c.topN);
  };

  // Encoding visibility per chart type.
  const showY = !["histogram", "heatmap"].includes(chartType);
  const showSeries = ["bar", "line", "area", "scatter", "box"].includes(chartType);
  const showAgg =
    (chartType === "bar" || chartType === "line" || chartType === "area" || chartType === "kpi") &&
    (yCol === "__count__" || (yCol && isNumericColumn(rows, yCol)));
  const showBins = chartType === "histogram";
  const showTopN = chartType === "bar";

  const colOpts = columns.map((c) => ({ value: c, label: c }));
  const yOpts = [
    { value: "__count__", label: "count(*)" },
    ...numCols.map((c) => ({ value: c, label: c })),
  ];
  const seriesOpts = [{ value: "", label: "— none —" }, ...colOpts];

  const builderDisabled = !project || columns.length === 0;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8 pb-16">
      {/* Top bar */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-hairline">
        <div className="flex items-end gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-1">Project</div>
            <div className="relative">
              <select
                value={projectId ?? ""}
                onChange={(e) => setProjectId(e.target.value || null)}
                className="appearance-none h-9 pl-3 pr-8 text-[13.5px] rounded-md border border-hairline bg-surface text-ink hover:border-coral/40 focus:outline-none focus:border-coral min-w-[240px]"
              >
                <option value="">Select a project…</option>
                {sortedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || "Untitled project"} · {formatRelative(p.modifiedAt)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3 pointer-events-none" />
            </div>
          </div>
          <h1 className="text-[22px] text-ink pb-0.5" style={{ letterSpacing: "-0.01em" }}>
            Visualisation
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-[12.5px] text-ink-3 tabular">
            {project
              ? `${columns.length} columns · ${pipelineTotalRows.toLocaleString()} rows${isPipelineLoading ? " · loading…" : ""}`
              : "—"}
          </div>
          <Link
            to="/datasets"
            search={projectId ? { projectId } : {}}
            className="text-[12.5px] text-ink-2 hover:text-coral transition-colors"
          >
            Open in Datasets
          </Link>
          <Link
            to="/ai-analysis"
            className="text-[12.5px] text-ink-2 hover:text-coral transition-colors"
          >
            Send to AI Analysis
          </Link>
        </div>
      </header>

      {/* Three-column body */}
      <div className="mt-6 grid grid-cols-[280px_1fr] gap-6">
        {/* LEFT RAIL */}
        <aside className={`flex flex-col gap-6 ${builderDisabled ? "opacity-60 pointer-events-none" : ""}`}>
          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-2">Chart type</div>
            <div className="flex flex-col gap-1.5">
              {CHART_TYPES.map(({ value, label, Icon, desc }) => {
                const active = chartType === value;
                return (
                  <button
                    key={value}
                    onClick={() => setChartType(value)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                      active
                        ? "border-coral/50 bg-coral-tint"
                        : "border-hairline bg-surface hover:bg-surface-hover"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-coral" : "text-ink-2"}`} />
                    <div className="min-w-0">
                      <div className={`text-[13px] ${active ? "text-coral font-medium" : "text-ink"}`}>{label}</div>
                      <div className="text-[11px] text-ink-3 leading-tight">{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-2">Encodings</div>
            <div className="flex flex-col gap-3">
              {chartType !== "heatmap" && chartType !== "kpi" && (
                <div>
                  <label className="block text-[12px] text-ink-2 mb-1">X axis</label>
                  <NativeSelect value={xCol} onChange={setXCol} options={colOpts} placeholder="—" />
                </div>
              )}
              {showY && (
                <div>
                  <label className="block text-[12px] text-ink-2 mb-1">Y axis</label>
                  <NativeSelect value={yCol} onChange={setYCol} options={yOpts} />
                </div>
              )}
              {showSeries && (
                <div>
                  <label className="block text-[12px] text-ink-2 mb-1">Series / colour</label>
                  <NativeSelect value={seriesCol} onChange={setSeriesCol} options={seriesOpts} />
                </div>
              )}
              {showAgg && (
                <div>
                  <label className="block text-[12px] text-ink-2 mb-1">Aggregation</label>
                  <NativeSelect
                    value={agg}
                    onChange={(v) => setAgg(v as Agg)}
                    options={[
                      { value: "sum", label: "sum" },
                      { value: "avg", label: "avg" },
                      { value: "min", label: "min" },
                      { value: "max", label: "max" },
                      { value: "count", label: "count" },
                      { value: "median", label: "median" },
                    ]}
                  />
                </div>
              )}
              {showBins && (
                <div>
                  <label className="block text-[12px] text-ink-2 mb-1">Bin count</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={bins}
                    onChange={(e) => setBins(Math.max(2, Math.min(60, Number(e.target.value) || 2)))}
                    className="w-full h-8 px-2.5 text-[12.5px] rounded-md border border-hairline bg-surface text-ink focus:outline-none focus:border-coral"
                  />
                </div>
              )}
              {showTopN && (
                <div>
                  <label className="block text-[12px] text-ink-2 mb-1">Top-N filter</label>
                  <input
                    type="number"
                    min={0}
                    value={topN}
                    onChange={(e) => setTopN(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full h-8 px-2.5 text-[12.5px] rounded-md border border-hairline bg-surface text-ink focus:outline-none focus:border-coral"
                  />
                  <div className="text-[11px] text-ink-3 mt-1">0 = no limit</div>
                </div>
              )}
              {chartType === "heatmap" && (
                <div className="text-[12px] text-ink-3">
                  Computes pairwise correlation across all currently-selected numeric columns ({numCols.length}).
                </div>
              )}
            </div>
          </section>
        </aside>

        {/* CENTER CANVAS */}
        <main>
          <section className="rounded-2xl border border-hairline bg-surface min-h-[460px] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-hairline/60">
              <div className="text-[12.5px] text-ink-2">
                {project ? chartTitle(config) : "No project selected"}
              </div>
              {project && columns.length > 0 && (
                <div className="flex items-center gap-1.5 relative">
                  <button
                    onClick={() => setExportMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[12px] rounded-md border border-hairline text-ink-2 hover:text-ink hover:border-coral/40"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Export chart
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-9 z-20 w-32 rounded-lg border border-hairline bg-surface shadow-[var(--shadow-md)] p-1">
                      <button
                        onClick={exportPNG}
                        className="w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-surface-hover text-ink"
                      >
                        PNG
                      </button>
                      <button
                        onClick={exportSVG}
                        className="w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-surface-hover text-ink"
                      >
                        SVG
                      </button>
                    </div>
                  )}
                  <button
                    onClick={exportCSV}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[12px] rounded-md border border-hairline text-ink-2 hover:text-ink hover:border-coral/40"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export data
                  </button>
                </div>
              )}
            </div>
            <div ref={chartHostRef} className="flex-1 p-4">
              {!project ? (
                <EmptyState
                  title="Select a project to begin"
                  body="Pick a project above. Charts use the same pipeline output as the Datasets page."
                />
              ) : columns.length === 0 ? (
                <EmptyState
                  title="No columns to chart"
                  body="This project has no pipeline output yet. Open it in Datasets to choose attributes and add steps."
                />
              ) : (
                <ChartCanvas config={config} built={built} />
              )}
            </div>
            {built.error && project && columns.length > 0 && (
              <div className="mx-5 mb-5 rounded-lg border border-coral/30 bg-coral-tint px-3 py-2 text-[12.5px] text-coral">
                {built.error}
              </div>
            )}
          </section>

          {/* SAVED CHARTS */}
          {project && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[12.5px] text-ink-2">
                  Saved charts <span className="text-ink-3">· {savedCharts.length}</span>
                </div>
                <button
                  onClick={addCurrentToProject}
                  disabled={columns.length === 0 || !!built.error}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] rounded-md bg-coral text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" /> Add to project
                </button>
              </div>
              {savedCharts.length === 0 ? (
                <div className="text-[12px] text-ink-3 border border-dashed border-hairline rounded-lg px-4 py-6 text-center">
                  No saved charts yet. Build one and press “Add to project”.
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {savedCharts.map((c) => (
                    <SavedChartCard
                      key={c.id}
                      config={c}
                      rows={rows}
                      columns={columns}
                      onClick={() => loadSaved(c)}
                      onRemove={() => removeSaved(c.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center px-6">
      <div className="text-[15px] text-ink mb-1">{title}</div>
      <div className="text-[13px] text-ink-2 max-w-sm">{body}</div>
    </div>
  );
}

function chartTitle(c: ChartConfig): string {
  const t = c.chartType[0].toUpperCase() + c.chartType.slice(1);
  if (c.chartType === "heatmap") return `${t} · correlation`;
  if (c.chartType === "histogram") return `${t} · ${c.x ?? "—"}`;
  if (c.chartType === "kpi") return `${t} · ${c.agg ?? "avg"}(${c.y ?? "—"})`;
  const y = c.y === "__count__" || !c.y ? "count" : c.y;
  return `${t} · ${y}${c.x ? ` by ${c.x}` : ""}${c.series ? ` · ${c.series}` : ""}`;
}

// ---------- Chart canvas ----------

function ChartCanvas({
  config,
  built,
}: {
  config: ChartConfig;
  built: ReturnType<typeof buildChartData>;
}) {
  if (built.error) {
    return (
      <div className="h-full min-h-[380px] flex items-center justify-center text-[13px] text-ink-3">
        Adjust encodings to render a chart.
      </div>
    );
  }
  if (config.chartType === "kpi") {
    return (
      <div className="h-full min-h-[380px] flex flex-col items-center justify-center">
        <div className="text-[12px] uppercase tracking-[0.08em] text-ink-3 mb-2">
          {(config.agg ?? "avg")}({config.y})
        </div>
        <div className="text-[64px] tabular text-coral leading-none">
          {built.kpiValue === null || built.kpiValue === undefined ? "—" : built.kpiValue.toLocaleString()}
        </div>
      </div>
    );
  }
  if (config.chartType === "heatmap") {
    return <Heatmap built={built} />;
  }
  return <CartesianChart config={config} built={built} />;
}

function CartesianChart({
  config,
  built,
}: {
  config: ChartConfig;
  built: ReturnType<typeof buildChartData>;
}) {
  const chartCfg = Object.fromEntries(
    built.yKeys.map((k, i) => [k, { label: k, color: PALETTE[i % PALETTE.length] }]),
  );
  const common = {
    data: built.data,
    margin: { top: 16, right: 16, left: 8, bottom: 8 },
  };
  const xLabel = built.xKey;
  if (config.chartType === "bar") {
    return (
      <ChartContainer config={chartCfg} className="h-[420px] w-full">
        <BarChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={xLabel} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {built.yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {built.yKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ChartContainer>
    );
  }
  if (config.chartType === "line") {
    return (
      <ChartContainer config={chartCfg} className="h-[420px] w-full">
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={xLabel} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {built.yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {built.yKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ChartContainer>
    );
  }
  if (config.chartType === "area") {
    return (
      <ChartContainer config={chartCfg} className="h-[420px] w-full">
        <AreaChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={xLabel} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {built.yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {built.yKeys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.25}
              strokeWidth={2}
              stackId={built.yKeys.length > 1 ? "a" : undefined}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    );
  }
  if (config.chartType === "histogram") {
    return (
      <ChartContainer config={{ count: { label: "count", color: PALETTE[0] } }} className="h-[420px] w-full">
        <BarChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill={PALETTE[0]} />
        </BarChart>
      </ChartContainer>
    );
  }
  if (config.chartType === "box") {
    // Render as range + median markers via stacked bars (min→q1, q1→q3, q3→max), plus a median line approximation.
    const data = built.data.map((d) => ({
      ...d,
      _lower: Number(d.q1) - Number(d.min),
      _box: Number(d.q3) - Number(d.q1),
      _upper: Number(d.max) - Number(d.q3),
      _base: Number(d.min),
    }));
    return (
      <ChartContainer
        config={{ _box: { label: "IQR", color: PALETTE[0] } }}
        className="h-[420px] w-full"
      >
        <BarChart data={data} margin={common.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={built.xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="_base" stackId="b" fill="transparent" />
          <Bar dataKey="_lower" stackId="b" fill={PALETTE[1]} opacity={0.4} />
          <Bar dataKey="_box" stackId="b" fill={PALETTE[0]} />
          <Bar dataKey="_upper" stackId="b" fill={PALETTE[1]} opacity={0.4} />
        </BarChart>
      </ChartContainer>
    );
  }
  // scatter
  const yKey = config.y!;
  const xKey = config.x!;
  if (config.series) {
    const seriesGroups: Record<string, Record<string, unknown>[]> = {};
    for (const d of built.data as Record<string, unknown>[]) {
      const k = String(d.__series ?? "");
      (seriesGroups[k] ||= []).push(d);
    }
    return (
      <ChartContainer config={chartCfg} className="h-[420px] w-full">
        <ScatterChart margin={common.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis type="number" dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey={yKey} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {Object.entries(seriesGroups).map(([s, data], i) => (
            <Scatter key={s} name={s} data={data} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </ScatterChart>
      </ChartContainer>
    );
  }
  return (
    <ChartContainer
      config={{ [yKey]: { label: yKey, color: PALETTE[0] } }}
      className="h-[420px] w-full"
    >
      <ScatterChart margin={common.margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis type="number" dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey={yKey} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Scatter data={built.data} fill={PALETTE[0]} />
      </ScatterChart>
    </ChartContainer>
  );
}

function Heatmap({ built }: { built: ReturnType<typeof buildChartData> }) {
  const cols = built.heatmapColumns ?? [];
  if (!cols.length) return null;
  const cell = (v: number) => {
    const a = Math.max(0, Math.min(1, Math.abs(v)));
    const color =
      v >= 0
        ? `color-mix(in oklab, var(--coral) ${Math.round(a * 80)}%, var(--surface))`
        : `color-mix(in oklab, var(--data-slate) ${Math.round(a * 80)}%, var(--surface))`;
    return color;
  };
  return (
    <div className="overflow-auto h-full min-h-[380px]">
      <table className="border-separate border-spacing-0 text-[11px] tabular">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface" />
            {cols.map((c) => (
              <th key={c} className="px-1 py-1 font-normal text-ink-3 text-left whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {built.data.map((row) => (
            <tr key={String(row.__row)}>
              <th className="sticky left-0 bg-surface pr-2 py-1 font-normal text-ink-3 text-right whitespace-nowrap">
                {String(row.__row)}
              </th>
              {cols.map((c) => {
                const v = Number(row[c] ?? 0);
                return (
                  <td
                    key={c}
                    className="border border-surface text-center"
                    style={{ background: cell(v), color: Math.abs(v) > 0.6 ? "white" : "var(--ink)", minWidth: 44, padding: 4 }}
                    title={`${row.__row} × ${c}: ${v.toFixed(2)}`}
                  >
                    {v.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Saved chart thumbnail ----------

function SavedChartCard({
  config,
  rows,
  columns,
  onClick,
  onRemove,
}: {
  config: ChartConfig;
  rows: Record<string, unknown>[];
  columns: string[];
  onClick: () => void;
  onRemove: () => void;
}) {
  const built = useMemo(() => buildChartData(rows, columns, config), [rows, columns, config]);
  return (
    <div className="group relative shrink-0 w-[180px] rounded-lg border border-hairline bg-surface hover:border-coral/40 transition-colors">
      <button
        onClick={onClick}
        className="w-full text-left p-2"
        title="Load into builder"
      >
        <div className="h-20 w-full bg-canvas/60 rounded overflow-hidden flex items-center justify-center">
          <ThumbChart config={config} built={built} />
        </div>
        <div className="mt-2 text-[11.5px] text-ink truncate">{chartTitle(config)}</div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded bg-surface border border-hairline flex items-center justify-center text-ink-3 hover:text-coral"
        aria-label="Remove saved chart"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function ThumbChart({
  config,
  built,
}: {
  config: ChartConfig;
  built: ReturnType<typeof buildChartData>;
}) {
  if (built.error || !built.data.length) {
    return <div className="text-[10px] text-ink-3">—</div>;
  }
  if (config.chartType === "kpi") {
    return (
      <div className="text-[18px] tabular text-coral">
        {built.kpiValue === null || built.kpiValue === undefined ? "—" : built.kpiValue.toLocaleString()}
      </div>
    );
  }
  if (config.chartType === "heatmap") {
    return <div className="text-[10px] text-ink-3">heatmap</div>;
  }
  const c = { [built.yKeys[0]]: { label: built.yKeys[0], color: PALETTE[0] } };
  const Chart = config.chartType === "line" || config.chartType === "area" ? LineChart : BarChart;
  return (
    <ChartContainer config={c} className="h-20 w-full">
      <Chart data={built.data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        {Chart === BarChart ? (
          <Bar dataKey={built.yKeys[0]} fill={PALETTE[0]} />
        ) : (
          <Line type="monotone" dataKey={built.yKeys[0]} stroke={PALETTE[0]} dot={false} strokeWidth={1.5} />
        )}
      </Chart>
    </ChartContainer>
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
