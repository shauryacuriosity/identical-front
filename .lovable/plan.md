## Goal

Two small changes to the Datasets page, plus a pipeline-logic verification pass that only edits code if a real bug is found.

## 1. "Add dataset" inserts an unselected slot

Today `addSlot` (src/routes/datasets.tsx ~L1241) auto-picks the first unused dataset name and immediately attaches it:

```ts
const addSlot = () => {
  const next = availableNames.find((d) => !datasetSlots.includes(d));
  if (next) setDatasetSlots([...datasetSlots, next]);
};
```

Change it to always append an empty-string slot so the user explicitly picks a dataset from the dropdown:

```ts
const addSlot = () => setDatasetSlots([...datasetSlots, ""]);
```

Also drop the "all in use" disable on the button — with an empty placeholder the slot is independent of remaining names. Disable instead when `datasetSlots.includes("")` so users can't stack multiple empty placeholders.

### DatasetBar empty-state rendering (src/routes/datasets.tsx L178+)

When `value === ""`:
- Replace `<span className="font-mono ...">{value}</span>` with `<span className="text-[13.5px] text-ink-2 italic">Please select a dataset</span>`.
- Hide the row-count chip (`· 2,431 rows`) and the coral status dot — show a dimmed dot instead.
- Auto-open the dropdown on mount when value is empty (small `useEffect` keyed on `value === ""`) so the user immediately sees options. The dropdown's `availableNames` filter already excludes names present in `usedNames` via the `disabled` flag, which still works.

### Downstream guards

Anywhere we currently assume every slot has a name, filter empties first:

- `availableNames` lookup `tables` build (~L1146): `for (const slot of datasetSlots) { if (!slot) continue; ... }`.
- `groups` (~L1214): `datasetSlots.filter(Boolean).map(...)` so the attribute sidebar doesn't render a blank header.
- `rowCountBySlot[name]` access in DatasetBar render: pass `undefined` for empty slot (existing fallback handles that).
- FROM/JOIN dropdown options in `optionsForPart` already come from `slotNames`; switch to `slotNames.filter(Boolean)` so empty placeholders never appear as a pickable FROM/JOIN value.
- `effectiveName`/`placeholder` project-name derivation (~L1287): use `datasetSlots.find(Boolean)` instead of `datasetSlots[0]` so an empty leading slot doesn't blank the project title.
- Pipeline auto-rewrite effect (~L1167): when sweeping steps, treat `""` the same as a removed slot — null-out FROM/JOIN parts that referenced an empty slot (already handled because `slotSet` includes `""` if present; tighten by `new Set(datasetSlots.filter(Boolean))`).

No change to `runPipeline` is needed — a `from` step whose value is `""` already falls through `if (!name) continue;` and produces an empty result with a "No rows" note.

## 2. Pipeline operations verification (read-only audit)

Walk through `src/lib/pipeline-exec.ts` against the step shapes built in `datasets.tsx` and only edit if a real mismatch is found. Initial audit shows everything lines up:

- **FROM** — `partVal(step, "FROM")` matches the seeded shape `{label:"FROM", value:<name>}`.
- **JOIN** — reads `JOIN`/`ON`/`USING`; matches seed `[{JOIN},{ON},{USING:"Inner Join"}]`. Cross/Left/Right/Outer/Inner branches all map to `joinOptions`. Right/Outer side correctly tracks `matchedRight` via `Set<Row>` (reference identity is safe because we never copy `r` before insertion into the index).
- **AGGREGATE** — `AGGREGATE` (column) + `BY` (`aggOptions`: Sum/Mean/Median/Count/Min / Max) match. `computeAgg` covers each branch; `Min / Max` returns the string `"min / max"` which is intentional given the single output column.
- **FILTER** — parts are `[{label:"FILTER", value:<col>}, {label:<op>, value:<val>}]`; executor reads `parts[1].label` for op and `parts[1].value` for val. Matches `filterOptions`.
- **SORT** — parts are `[{label:"SORT", value:<col>}, {label:"↓", value:<kind>}]`; executor reads `parts[1].value`. `Custom Order` falls through as a no-op (documented behavior).

No edits planned to `pipeline-exec.ts` unless the audit during implementation surfaces an actual regression. If something does turn up (e.g. an edge case where `selectedCols` strips an aggregate output column), the fix will be the minimum change required and called out in the final summary.

## Files

- Edited: `src/routes/datasets.tsx` — `addSlot`, `DatasetBar` empty-state, downstream `Boolean` filters, project-name fallback.
- Audited (likely no change): `src/lib/pipeline-exec.ts`.

## Not touched

`projects-store.ts`, `dataset-import.ts`, `ai-analysis.tsx`, styles, other routes.
