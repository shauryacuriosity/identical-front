## Goal

Make every step in the Datasets pipeline editable in-place. Click any value (dataset name, column, join type, aggregation, filter operator/value, sort direction) and pick a new one from a dropdown driven by the current dataset schemas — including imported datasets.

## Scope

`src/routes/datasets.tsx` only. No backend, no styles changes beyond a small popover.

## Changes

### 1. Wire schema + dataset list into `PipelineStrip`

Currently `PipelineStrip` owns `steps` state but has no access to schemas. Lift the data it needs as props:

```ts
<PipelineStrip
  availableNames={availableNames}
  schemaBySlot={schemaBySlot}
/>
```

(Steps state stays inside `PipelineStrip` — only the option sources move in.)

### 2. New `EditablePart` component

Replaces the read-only `<span>` rendering inside both `PipelineChip` and `SentenceFragment`. Renders as a small button; on click opens a dropdown of options (reuses the existing dropdown styling from `DatasetBar`/`Dropdown`).

Props: `value`, `mono`, `options: string[] | { type: "text" }`, `onChange(next)`.

Free-text variant (for filter value `120`) renders an `<input>` instead of a list.

### 3. Per-step option resolution

A helper `optionsForPart(step, partLabel, ctx)` returns the option list for each part, where `ctx = { availableNames, schemaBySlot, currentSteps }`:

| Step | Part | Options |
|---|---|---|
| `from` | FROM | `availableNames` |
| `join` | JOIN | `availableNames` (excluding the current FROM dataset) |
| `join` | ON | union of column names from FROM + JOIN datasets |
| `join` | USING | `joinOptions` |
| `aggregate` | AGGREGATE | numeric columns across all datasets currently referenced in the pipeline |
| `aggregate` | BY | `aggOptions` |
| `filter` | FILTER | all columns from referenced datasets |
| `filter` | operator (`>`, `=`, …) | `filterOptions` (changes the part `label`, not value) |
| `filter` | value | free-text input |
| `sort` | SORT | all columns from referenced datasets |
| `sort` | `↓` | `sortOptions` |

"Referenced datasets" = the FROM dataset plus any JOIN datasets that appear earlier in the pipeline than the step being edited.

### 4. Update existing components

- `PipelineChip`: render each `part` via `EditablePart` instead of plain spans. Keep the remove button.
- `SentenceFragment`: replace each `Mono`/`Plain` button with `EditablePart`. Drop the existing `onClick → focusChip` behaviour (clicking a value now edits it). Move the focus/pulse behaviour onto a small caret-grip area or just remove it — the sentence is now directly editable, which is more useful.
- Mutation: `EditablePart`'s `onChange` calls a `updatePart(stepId, partLabel, next)` that lives in `PipelineStrip` and does an immutable `setSteps` update. For filter operator-label changes, use `updatePartLabel(stepId, partIndex, nextLabel)`.

### 5. Edge cases

- Changing a `from` value to one no longer in `availableNames` shouldn't be possible — the dropdown only lists current names.
- If a join's ON column is no longer in the joined dataset's schema after the user changes JOIN target, leave the value as-is (stale) but it'll be selectable from the new list — no auto-reset, keeps edits non-destructive.
- Filter free-text value is stored as a string; no type coercion.

## Files

- `src/routes/datasets.tsx` — all edits

## Not touched

`dataset-import.ts`, `__root.tsx`, styles, other routes.
