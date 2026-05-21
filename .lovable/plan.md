## Visualisation page — implementation plan

Rebuild `src/routes/visualisation.tsx` per the FINAL spec. Pure client view over `runPipeline(project)`. No backend, no AI, no new deps.

### Files

**New**
- `src/lib/chart-config.ts` — `ChartConfig` type + `buildChartData(rows, columns, config)`.
- `src/components/project-select.tsx` — extracted from `ai-analysis.tsx` (defaults to last-modified project, used by both pages).

**Edited**
- `src/lib/projects-store.ts` — add `charts?: ChartConfig[]` to `Project` + `setProjectCharts(id, charts)`.
- `src/routes/visualisation.tsx` — full rebuild.
- `src/routes/ai-analysis.tsx` — swap inline project dropdown for `<ProjectSelect />` (no behaviour change).

**Untouched:** `/datasets`, `/runs/$runId`, `__root.tsx`, all design tokens, all chart/shadcn primitives.

### `chart-config.ts` shape

```ts
export type ChartType =
  | "bar" | "line" | "area" | "scatter"
  | "histogram" | "box" | "heatmap" | "kpi";

export type Agg = "sum" | "avg" | "min" | "max" | "count" | "median";

export type ChartConfig = {
  id: string;
  chartType: ChartType;
  x?: string;          // column
  y?: string;          // column | "__count__"
  series?: string;     // optional categorical
  agg?: Agg;           // when Y numeric + X categorical
  bins?: number;       // histogram
  topN?: number;       // bar
};

export type BuiltChart = {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKeys: string[];     // multiple when series is set
  error?: string;      // populated for invalid encodings → renders inline hint
};

export function buildChartData(
  rows: Row[],
  columns: string[],   // currently-selected pipeline columns
  config: ChartConfig,
): BuiltChart;
```

Numeric detection: column is numeric when ≥80% non-null values parse as finite numbers (reuse `toNum` pattern from `pipeline-exec.ts`). Heatmap iterates all currently-selected numeric columns and emits Pearson correlation cells. KPI returns a single aggregated value (renders as big number, no axes).

### Layout (Tailwind, existing tokens only)

```
┌──────────────────────────────────────────────────────────────┐
│  [ProjectSelect ▾]            12 columns · 2,431 rows         │
│                               Open in Datasets · Send to AI   │
├────────────┬─────────────────────────────────────┬───────────┤
│ CHART TYPE │                                     │           │
│  • Bar     │         [ chart canvas card ]       │           │
│  · Line    │      axis labels = text-primary     │           │
│  · Area    │      gridlines  = text-muted        │           │
│  · ...     │      top-right: ⬇ Export chart      │           │
│            │                  ⬇ Export data      │           │
│ ENCODINGS  │                                     │           │
│ X axis  ▾  │                                     │           │
│ Y axis  ▾  │   [inline error hint if invalid]    │           │
│ Series  ▾  │                                     │           │
│ Agg     ▾  │                                     │           │
├────────────┴─────────────────────────────────────┴───────────┤
│ Saved charts                              [+ Add to project] │
│ [thumb] [thumb] [thumb] ...   (horizontal scroll, × on hover)│
└──────────────────────────────────────────────────────────────┘
```

- Top bar uses same surface/hairline classes as `ai-analysis.tsx` header row.
- Left rail width `w-[280px]`, sticky within the page section.
- Empty state in canvas: centered "Select a project to begin" using existing muted-text style.
- "Export chart" menu: PNG via `canvas.toDataURL` after rendering the SVG into a canvas (no new deps); SVG by serializing the live Recharts `<svg>` node.
- "Export data" CSV: serializes `BuiltChart.data` directly — exactly the post-aggregation rows feeding the chart.

### Column source

Columns shown in encoding dropdowns = `runPipeline(project).columns` (already respects `selectedAttrs` since the pipeline strips deselected attrs). Deselecting in Datasets → fewer columns here automatically. No new state needed.

### Saved charts

- Stored on `Project.charts` via `setProjectCharts`.
- Thumb card: tiny Recharts (`ChartContainer` at fixed `h-20 w-32`, axes hidden) + label `"{ChartType} · {y || "count"}"`.
- Click → loads `ChartConfig` back into builder state.
- Hover × → `setProjectCharts(id, charts.filter(c => c.id !== clicked))`.

### Encoding rules per chart type (drives conditional UI)

| Type      | X | Y | Series | Agg | Bins | TopN |
|-----------|---|---|--------|-----|------|------|
| bar       | ✓ | ✓ | ✓      | ✓*  |      | ✓    |
| line      | ✓ | ✓ | ✓      | ✓*  |      |      |
| area      | ✓ | ✓ | ✓      | ✓*  |      |      |
| scatter   | ✓ | ✓ | ✓      |     |      |      |
| histogram | ✓ |   |        |     | ✓    |      |
| box       | ✓ | ✓ | ✓      |     |      |      |
| heatmap   |   |   |        |     |      |      |
| kpi       |   | ✓ |        | ✓   |      |      |

`*Agg` only when Y is numeric and X is categorical.

### Error handling

`buildChartData` never throws. Invalid combinations (e.g. avg on non-numeric Y) return `{ data:[], xKey:"", yKeys:[], error: "..." }`. Canvas renders inline hint card below chart area, no crash.

### Verification — three states to show after build

1. **No project** — top bar shows "Select a project", canvas shows empty state, left rail disabled.
2. **Project with empty pipeline** — encoding dropdowns empty, canvas shows "No columns selected — choose attributes in Datasets".
3. **Project with full pipeline + one saved chart** — default bar chart renders, saved-strip shows one thumbnail, click reloads, × removes.

### Out of scope (per spec)
No Pie/Donut, no LLM, no dashboard grid, no new routes, no token/style overhaul, no new deps.
