## Changes

### 1. Datasets page — remove dataset slots
In `src/routes/datasets.tsx`:
- Refactor `DatasetBar` to accept an `onRemove?: () => void` prop. Add a small X button (lucide `X`) on the right side of the bar (next to the chevron), shown only when `onRemove` is provided. Stop propagation so clicking remove doesn't toggle the bar's open state.
- In `DatasetsPage`, pass `onRemove={() => setDatasetSlots(slots => slots.filter((_, idx) => idx !== i))}` to each `DatasetBar`. Always allow removal (including the last one — empty state is fine; the existing "Add dataset" button restores it).

### 2. Datasets page — make the dataset bar dropdown selectable
Currently `DatasetBar` toggles an `open` state that does nothing visible. Replace it with a real selector:
- Convert `DatasetBar` into a controlled component: props `{ value: string; onChange: (next: string) => void; onRemove?: () => void; usedNames: string[] }`.
- Available options: a fixed list `["Dataset_A.csv", "Dataset_B.csv"]` (matches the two `schemaBySlot` entries). Disable options already chosen by another slot (using `usedNames`) so each dataset appears at most once.
- On click, open a dropdown panel (same visual pattern as `Dropdown` component already in the file) listing the options; selecting one calls `onChange` and closes the panel.
- In `DatasetsPage`:
  - Change `datasetSlots` state to hold the actual selected dataset name per slot (initial `["Dataset_A.csv"]`).
  - `addSlot` picks the first unused option from `["Dataset_A.csv", "Dataset_B.csv"]`; if all are used, disable the "Add dataset" button.
  - `schemaBySlot` lookup and `groups` already key off the slot name, so the sidebar auto-updates when a slot's dataset changes.

### 3. Header — remove drop shadow from active nav pills
In `src/routes/__root.tsx`:
- Remove the `style={homeActive ? { boxShadow: "var(--shadow-depth)" } : undefined}` on the brand `<Link to="/">`.
- Remove the `style={active ? { boxShadow: "var(--shadow-depth)" } : undefined}` on each tab `<Link>`.
- Leave the outer pill nav's `boxShadow: "var(--shadow-depth)"` untouched (it's the container, not the selected area).

## Files touched
- `src/routes/__root.tsx`
- `src/routes/datasets.tsx`

## Not touched
- Pipeline strip, sidebar, footer, styles.css, other routes, data fetching.