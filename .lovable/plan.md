## Goal

On the Datasets page, let the user import one or more local files as datasets. Parsed entirely in the browser and kept in component state (no persistence, gone on refresh). The sidebar and dataset bars treat imported datasets like the built-in `Dataset_A.csv` / `Dataset_B.csv`.

## UX

In `src/routes/datasets.tsx`:
- Next to the existing `Add dataset` dashed button, add a second dashed button `Import file` with an upload icon. The two buttons sit side-by-side (flex row, equal width).
- Clicking `Import file` triggers a hidden `<input type="file" multiple>` with
  `accept=".csv,.tsv,.txt,.json,.xlsx,.xls,.xpt"`.
- For each selected file: parse it, derive `{ name, attrs, rowCount }`, register it in `importedDatasets`, and append a new dataset slot pointing to its name. If a name collides with an existing dataset, suffix `(1)`, `(2)`, etc.
- While parsing, show a small inline spinner/“Importing…” state on the button; on failure, show a toast (use existing `sonner` already in `src/components/ui/sonner.tsx`) with the filename + error.

## Parsing

New helper: `src/lib/dataset-import.ts` exporting:
```
parseDatasetFile(file: File): Promise<{ attrs: Attr[]; rowCount: number }>
```
Dispatch by extension:
- `.csv`, `.tsv`, `.txt`, `.xlsx`, `.xls` → SheetJS (`xlsx` package). Read the first sheet, take row 1 as headers, count remaining rows.
- `.json` → native `JSON.parse`. Must be an array of objects; use the union of keys from the first ~200 rows as headers.
- `.xpt` (SAS Transport) → use `xport-reader` from npm if it installs cleanly; otherwise implement a minimal XPORT v5 header parser (read member header + NAMESTR records to extract variable names and observation count). Numeric NAMESTR type → `num`, char → `cat`. Best-effort: if parsing fails, surface a clear toast error.

Type inference for non-XPT formats:
- Column named `id` (case-insensitive) or ending in `_id` → `id`.
- Sampled values all parseable as finite numbers (and non-empty) → `num`.
- Otherwise → `cat`.

## Wiring into `DatasetsPage`

- Add state `const [importedDatasets, setImportedDatasets] = useState<Record<string, { attrs: Attr[]; rowCount: number }>>({})`.
- Replace the module-level `schemaBySlot` constant with a computed map inside the component that merges built-ins + `importedDatasets`.
- `DatasetBar` gains an optional `rowCount?: number` prop; if provided, render that instead of the hardcoded `2,431 rows`.
- The per-slot `usedNames` check still applies — imported names are added to the pool of available datasets, but the dropdown only ever lists names that actually have a schema.
- Importing N files appends N slots in one batch (single `setDatasetSlots` call).

## Dependencies

```
bun add xlsx
```
Try `bun add xport-reader`; if it doesn't work in the Worker/Vite build, drop it and ship the minimal inline XPORT parser instead.

## Files

- `src/routes/datasets.tsx` — new button + file input + import handler + state changes
- `src/lib/dataset-import.ts` — new, all parsing logic
- `package.json` — `xlsx` (and possibly `xport-reader`)

## Not touched

`__root.tsx`, pipeline strip, footer, other routes, `styles.css`, backend.