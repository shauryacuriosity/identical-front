# Plan — Functional fixes + light visual corrections

Scope guardrails (do NOT touch): design tokens in `src/styles.css`, Supabase schema, any existing queries/mutations, the 4-step AI Analysis workflow structure, Recent Files table columns, existing routes.

---

## File 1 — `src/routes/__root.tsx` (TOP NAV: items 3, 4, 5)

- **Remove the standalone Home tab** from the `tabs` array. Remove the `Home` icon import and the `isHome` branch.
- **Make the Lotus wordmark + lotus mark the Home link**: wrap the brand cluster in `<Link to="/">`. When `pathname === "/"`, render the wordmark with the same active treatment used on other tabs (coral 18% bg pill + 2px coral underline). Per spec: if the coral background hurts legibility of the lotus icon, hide the icon when active and show text-only "Lotus" — leave icon visible when inactive.
- **Avatar dropdown** (item 4): convert the avatar button into a Radix `DropdownMenu` (already in repo at `src/components/ui/dropdown-menu.tsx`) with items: Profile, Settings, Dark mode (toggle visual only — local `useState` boolean with a checkmark/switch glyph, no theme wiring), Sign out. All items no-op except Settings.
- **Settings modal** (item 5): clicking Settings opens a `Dialog` (`src/components/ui/dialog.tsx`) with title "Settings" and placeholder body ("Settings coming soon."). Closes via X / overlay / Esc. State lifted into `AppHeader`.

---

## File 2 — `src/routes/index.tsx` (HOME: items 1, 2)

- **Row checkboxes + Select all** (item 1): repurpose the leftmost 16px column (currently `StatusDot`) to also hold a hover-revealed checkbox; add a header checkbox in the column header row. State: `selected: Set<string>` in `Index`.
  - Header checkbox `checked` when `selected.size === rows.length && rows.length > 0`, `indeterminate` when partial. Click toggles select-all/deselect-all.
  - Row checkbox toggles membership; when a row is unchecked while header is checked, header auto-uncomputes (derived state, no extra wiring).
  - Checkbox visual = same inline SVG checkbox pattern used in `datasets.tsx::Checkbox` (coral fill when checked), kept compact in 16px column. StatusDot stays — checkbox replaces it only on row hover OR when any row is selected (so the resting visual stays unchanged).
- **Row click → /datasets with preselect** (item 2): make each row a `Link to="/datasets" search={{ datasetId: f.id }}`. Row-action buttons keep their existing `e.stopPropagation()`; checkbox click also calls `stopPropagation` so it doesn't navigate.

---

## File 3 — `src/routes/datasets.tsx` (DATASETS: items 2 carry-through, 6, 7, 8, 9)

- **Validate search params** (item 2 receiver): add `validateSearch: (s) => ({ datasetId: typeof s.datasetId === "string" ? s.datasetId : undefined })` to `createFileRoute`. Read with `Route.useSearch()`. The hardcoded `datasetA`/`datasetB` data stays; we just expose the carry-through.
- **Page header with dataset name** (item 2): add an `<h1>` at the top of `DatasetsPage` showing the resolved dataset name. Since the datasets list isn't loaded here yet, fetch the single row by id via `useQuery` against `supabase.from("datasets").select("id,name").eq("id", datasetId).maybeSingle()` (read-only, additive — not a modification to an existing query). If no `datasetId`, render a neutral "Datasets" title.
- **Search filter** (item 6): wire the existing sidebar `<input placeholder="Filter attributes…">` to a `useState` and filter both `datasetA` and `datasetB` arrays (case-insensitive `.includes` on `name`) before passing into `<AttrGroup>`. Filter on every keystroke (`onChange`).
- **Pipeline List/Compact toggle** (item 7): add a small segmented toggle in the top-right of the "Pipeline" header inside `PipelineSentence` (or as a sibling header above `PipelineStrip`). Default = Compact (current `PipelineSentence` view). List = render each step on its own labeled row (label + parts on a separate line per step). State local to `PipelineStrip`; no data changes.
- **Minimum 1 dataset slot + "+" appender** (item 8): replace the two hardcoded `<DatasetBar name="Dataset_A.csv" />` / `<DatasetBar name="Dataset_B.csv" />` with `useState<string[]>(["Dataset_A.csv"])` and map. Add a dashed `+` button below the last `DatasetBar` that appends `"Dataset_${nextLetter}.csv"`. No maximum cap. The sidebar attribute groups continue to use the existing hardcoded `datasetA`/`datasetB` arrays (only the bars are dynamic — no query changes).
- **Dropdowns open on click + consistent chevron** (item 9): the `Dropdown` component already opens on click and already rotates `ChevronDown` 180° on open — confirm all four JOIN/AGGREGATE/SORT/FILTER instances use this same component. If any custom inline dropdown is found, swap it to `Dropdown`. Standardize on the **rotate-180 on open** convention (already present). Apply same convention to `DatasetBar`'s chevron (already does this — verify only).

---

## File 4 — `src/routes/ai-analysis.tsx` (AI ANALYSIS: items 10, 11, 12)

- **"Add field" appends a blank row** (item 10): locate the `Add field` button near line 690 and any siblings. Wire each to push a blank entry into its mapping array's `useState`. No structural change to the 4-step workflow — only the underlying list grows.
- **Step 1 & Step 3 dropdowns** (item 11): audit the inline dropdown near line 647 (uses `ChevronDown` without rotation). Swap to the same open-on-click + rotate-180 chevron pattern used in `datasets.tsx::Dropdown`. Apply consistently across every Step 1 and Step 3 dropdown.
- **Run name field** (item 12): around lines 319/528 — add a visible `<label>Run name</label>` above the input; bump input height to `h-11` and font to `text-[15px]`; change default state from `"Untitled run"` to `\`Untitled run · ${new Date().toISOString().slice(0,16)}\`` (computed once at mount via `useState(() => …)`).

---

## File 5 — Readability audit (item 13) — surgical only

Audit pass across `src/routes/index.tsx`, `src/routes/datasets.tsx`, `src/routes/ai-analysis.tsx`, `src/routes/__root.tsx`. **No token edits.** For every text/icon that resolves to `text-ink-3` or `opacity-50/60` while sitting on `bg-surface` (pink #FFF5F5) or `bg-canvas` (cream #F2D0CF):
- Body text → `text-ink` (token = `--text-primary` #1A0003).
- Muted/secondary labels → `text-ink-2` (token = `--text-muted` #673D3D).
- Remove `opacity-50/60` on the `Em` dash and on any washed-out chevron/icon so they read as `text-ink-2` solid.

This is a className-only sweep — no new tokens, no token value changes.

---

## Files I will NOT modify

- `src/routes/runs.$runId.tsx`, `src/routes/ai-analysis.results.tsx`, `src/routes/visualisation.tsx`
- `src/styles.css` (tokens locked)
- `src/integrations/supabase/*` (queries/mutations locked)
- `src/routeTree.gen.ts` (auto-generated)

---

## Sanity checks before applying

1. **Home item 1 — "Select all" checkbox**: there's no checkbox column on Home today. I'm planning to add one inside the existing 16px leftmost column (sharing space with `StatusDot`, revealing on hover / when any row is selected). Confirm that's what you meant, or say "add a dedicated checkbox column" and I'll widen the grid (this would touch the Recent Files column structure — which you said preserve, so I'm keeping it inside the existing 16px slot).
2. **Item 2 carry-through**: I'll read the dataset name via a new `useQuery` on `/datasets` keyed by `datasetId` — additive, doesn't modify existing queries. OK?
3. **Item 3 active state**: when Home is active, hide the lotus PNG and show text-only "Lotus" inside the coral pill. Inactive = icon + wordmark as today. Confirm.
4. **Item 9 / 11 chevron convention**: standardizing on **rotate-180° on open** (already the dominant pattern). Confirm over "keep pointing down permanently".

Approve and I'll apply files 1 → 5 in one pass.