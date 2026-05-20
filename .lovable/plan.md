## Goal

Three tightly related changes to the Datasets / AI Analysis flow:

1. Pipeline step dropdowns must list only datasets that are actually loaded into the current view (not the legacy hard-coded `ALL_DATASETS`).
2. AI Analysis "Select a dataset" becomes "Select a project", pre-filled with the most-recently-modified project, and downstream steps operate on the project's pipeline output.
3. Datasets page gets a live preview table driven by a real in-browser pipeline executor; preview reacts to attribute selections and to every pipeline edit. The Export button writes one combined file in a user-chosen format.

## 1. Capture real row data on import

`src/lib/dataset-import.ts` currently returns only `{ attrs, rowCount }`. Extend it to also return `rows: Record<string, unknown>[]`:

- `parseSheetLike` / `parseJson`: already produce row arrays — return them.
- `parseXpt`: row decoding is non-trivial; keep `rows: []` and surface a note via a new `rowsAvailable: boolean` flag so the preview can show "row data not available for SAS XPORT".

Type becomes `ParsedDataset = { attrs, rowCount, rows, rowsAvailable }`. Existing callers keep working because they only read `attrs`/`rowCount`.

Built-in mock slots (`Dataset_A.csv`, `Dataset_B.csv`) have no real rows. Add a tiny deterministic row generator in `datasets.tsx` (~25 rows each, seeded from attr name + index) so the preview is never empty for the seeded demo.

## 2. Lift attribute selection + pipeline to page level

Today `AttrGroup` owns selected attrs locally and `PipelineStrip` owns `steps` locally. Both need to feed the preview, so lift them into `DatasetsPage`:

- `selectedAttrs: Record<slot, Set<string>>` — default to "all selected" when a slot is first added.
- `steps: Step[]` — current `initialPipeline`, but with `FROM` re-seeded to `datasetSlots[0]` when slots change and the current FROM value disappears.
- `AttrGroup` and `PipelineStrip` accept controlled props.

## 3. Fix 1 — pipeline dropdowns reflect implemented datasets

In `optionsForPart` (datasets.tsx), the `availableNames` source for `FROM` and `JOIN` currently comes from `ctx.availableNames = [...ALL_DATASETS, ...imported]`. Change `EditCtx` to receive `slotNames: string[]` (the current `datasetSlots`) and use it for both branches:

- `FROM` → `slotNames`
- `JOIN` → `slotNames.filter(n => n !== fromValue)`
- `ON` / `AGGREGATE` / `FILTER` / `SORT` column lists already derive from `schemaBySlot` and `referencedDatasets`, which automatically restrict to the chosen slots — no change needed beyond the slotNames swap.

When a slot is removed, sweep `steps` to either drop or null-out parts that referenced the removed name, so dropdowns never display stale values.

## 4. Pipeline executor (`src/lib/pipeline-exec.ts`, new)

Pure function `runPipeline(steps, tables, selectedCols) → { columns, rows, totalRows, truncated, notes }` where `tables: Record<slot, Row[]>`.

Supported ops (matches existing Step kinds):

- `FROM` → start with `tables[name]`
- `JOIN` (inner/left/right/outer/cross) on `ON` key, prefixing collided columns with slot stem
- `AGGREGATE` numeric column `BY` Sum/Mean/Median/Count/Min/Max — groups by all remaining non-numeric columns currently selected (or returns a single scalar row if none)
- `FILTER` with Equals/Contains/Greater than/Less than/Between (Between takes `a..b`)
- `SORT` Ascending/Descending/Alphabetical/Reverse Alpha (Custom Order = no-op for now)

Final projection trims to `selectedCols` (union of selected attrs across referenced slots, minus columns removed by aggregate). Rows truncated to 200 for preview; full set used for export. `notes[]` collects any soft warnings ("XPT rows unavailable", "GROUP BY produced 1 row", etc).

## 5. Preview table UI

Replace the "No preview yet" empty state in `datasets.tsx` (lines ~1064-1076) with `<PreviewTable result={runPipeline(...)} />`:

- Header `<th>` cells use `text-primary` (token already in styles.css as `--primary`/`coral`).
- Body `<td>` cells use `text-muted-foreground` (mapped from `--ink-2`).
- Sticky header inside the scroll container, `tabular-nums`, max-height ~340px, monospace for numeric columns.
- Footer line: "Showing N of M rows · K cols" + any `notes`.
- Recomputed via `useMemo` over `steps`, `selectedAttrs`, `tables`, so any pipeline edit or attribute toggle re-renders instantly.

Also update the sticky footer `Result: — rows × — cols` to show the real counts.

## 6. Export one combined file

Replace the Export button onClick with a small format picker (popover): CSV, TSV, JSON, XLSX. (XPT export is out-of-scope — SAS XPORT writing is non-trivial; show it as disabled with a "not supported" hint, matching what import does already.) Export uses the full (non-truncated) executor result:

- CSV/TSV — built inline, BOM + RFC-4180 quoting.
- JSON — `JSON.stringify(rows, null, 2)`.
- XLSX — reuse already-installed `xlsx` (`XLSX.utils.json_to_sheet` → `XLSX.writeFile`).

Filename = `<projectName||"dataset">.<ext>`.

## 7. Share pipeline result with AI Analysis (Fix 2)

Extend `src/lib/projects-store.ts`:

- Add `Project.pipelineSteps?: Step[]` and `Project.selectedAttrs?: Record<slot, string[]>` (serialized as arrays).
- Add `setProjectPipeline(id, steps, selectedAttrs)` — called from `DatasetsPage` via a debounced `useEffect`.

In `src/routes/ai-analysis.tsx`:

- Delete the Supabase `datasetsQ` (`useQuery` on the `datasets` table) and `selectedDatasetId` state.
- Add `selectedProjectId` + `useProjects()`; default initial value to `projects[0]?.id` (list is already sorted by `modifiedAt desc`).
- Replace `<DatasetSelector />` with `<ProjectSelector />` (same shape, lists `{id, name, datasets.length}` and shows "n files · last modified …").
- Heading copy: "Select a dataset" → "Select a project". Disabled-CTA copy: "Select a dataset in Step 1 to run." → "Select a project in Step 1 to run.".
- Mapping rows: column dropdown options derive from the project's pipeline-executor output columns (via `runPipeline` reused from the lib), so AI Analysis sees the same joined/merged table that Datasets showed.
- `runMutation` payload changes `dataset_id: selectedDatasetId` → `project_id: selectedProjectId` (the Supabase `analysis_runs` row keeps its existing shape minus `dataset_id`; if the column is required, store the first slot name in a new `project_name` text field — flag if you'd rather migrate the schema).

## 8. Files

- New: `src/lib/pipeline-exec.ts`
- Edited: `src/lib/dataset-import.ts` (return rows + flag)
- Edited: `src/lib/projects-store.ts` (pipeline + selectedAttrs fields, setter)
- Edited: `src/routes/datasets.tsx` (lift state, fix dropdowns, preview table, export picker, sync to store)
- Edited: `src/routes/ai-analysis.tsx` (project selector, default = latest, drop datasetsQ, use executor columns)

## Not touched

`__root.tsx`, `index.tsx`, styles, other routes, Supabase schema.

## Open questions / assumptions

- XPT export is excluded (write path not implemented); CSV/TSV/JSON/XLSX cover the user's "etc". Flag if XPT-out is required.
- `analysis_runs` row stores `project_id` as free text (session-local id like `p1`); no DB migration. Flag if you'd like a real `projects` table.
- Preview is capped at 200 rows for performance; export uses the full dataset.
