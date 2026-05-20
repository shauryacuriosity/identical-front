# Plan

## 1. Themed active Lotus logo (`__root.tsx` + new component)

The active lotus SVG currently has hardcoded `#1A0003` fills/strokes, so importing it as `<img>` cannot inherit theme color. Convert it to an inline React component so it picks up `currentColor`.

- New file `src/components/lotus-mark-active.tsx`: inline the SVG, replace every `fill="#1A0003"` / `stroke="#1A0003"` with `fill="currentColor"` / `stroke="currentColor"`. Accept `className` so the parent controls size and color.
- `src/routes/__root.tsx`: drop the `lotusMarkActive` image import, use the new component when `homeActive`, and color it via `text-ink` (already on the brand link). This makes it follow the active text color in both light and dark modes.
- Keep the pink PNG (`lotusMark`) when the home tab is inactive — unchanged.

## 2. Shadow tuning + apply depth to active banner pills (`styles.css` + `__root.tsx`)

Opacity is already at 25%, so reduce dimensions slightly per the user's instruction.

- `src/styles.css`: change `--shadow-depth` from `0 10px 7px 0` to `0 8px 5px 0` for both the outer and inset shadows (Y 10→8, blur 7→5; X and spread stay 0). Drop/inner color tokens (already 25% opacity) are unchanged.
- `src/routes/__root.tsx`: when a nav pill is active (`bg-coral`), also apply `style={{ boxShadow: "var(--shadow-depth)" }}`. Applied to both the Lotus brand link (when `homeActive`) and each tab Link (when `active`). Inactive pills get no boxShadow.

## 3. Datasets page — sidebar mirrors loaded datasets, per-file Select all (`datasets.tsx`)

Today the sidebar always renders both `Dataset_A.csv` and `Dataset_B.csv` attribute groups regardless of how many dataset slots exist, and the `Checkbox` component has its own local `useState` so "Select all" is just a styled checkbox with no group behavior.

- Build a `datasetAttributes` lookup keyed by dataset filename (e.g. `Dataset_A.csv` → `datasetA`, `Dataset_B.csv` → `datasetB`). Newly-added slots without a known schema render an empty group (or fall back to `datasetA`'s shape) — pick the empty-group path so the sidebar accurately reflects what's actually present.
- Render one `AttrGroup` per entry in `datasetSlots` (not hardcoded A and B). The "Filter attributes" count and the legend stay; the per-group `items.length` already comes from the group itself.
- Refactor `AttrGroup` to own per-group selection state: a `Set<string>` of selected attribute names. Pass selection state + setters to the per-attribute checkboxes, and wire "Select all" to toggle all attribute names for *that group only* (indeterminate when partial). Replace the standalone `Checkbox` component's internal state with a controlled `checked` / `onChange` prop so each group's state is isolated.
- No cross-group selection, no shared store — selecting all in `Dataset_A.csv` leaves `Dataset_B.csv` untouched.

## Files touched
- `src/components/lotus-mark-active.tsx` (new)
- `src/routes/__root.tsx`
- `src/styles.css`
- `src/routes/datasets.tsx`

## Not touched
- Pipeline strip, dataset bars, footer, routes, data fetching, color tokens, light/dark palette values.
