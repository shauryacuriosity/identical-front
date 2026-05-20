# Palette + icon rollout

Five contained changes. No data/query/route logic touched.

## 1. Rebuild the design tokens (`src/styles.css`)

Replace the current `:root` + `.dark` palette with the exact table values. Token names stay the same so no consumer code breaks; values change.

Light (`:root`):
- `--bg-page: #F2D0CF` *(bg-dark — main page background)*
- `--bg-emphasis: #CAA8A7` *(bg-dark faded)*
- `--bg-surface: #FFF5F5` *(bg — cards, tiles, header pill)*
- `--bg-highlight: #FFFFFF` *(NEW — hover/highlight)*
- `--text-primary: #1A0003`
- `--text-muted: #673D3D`
- `--border-default: #A06B6B`
- `--border-muted: #C49090`
- `--accent-primary: #E8928E` (unchanged)
- `--accent-secondary: #0077FF`
- Inner shadow: `rgba(255,255,255,0.25)`; drop shadow: `rgba(0,0,0,0.25)`.

Dark (`.dark`):
- `--bg-page: #140F0F`
- `--bg-emphasis: #0A0101`
- `--bg-surface: #140405`
- `--bg-highlight: #6E4A4A`
- `--text-primary: #FFFFFF`
- `--text-muted: #D4908A`
- `--border-default: #737373`
- `--border-muted: #3D1718`
- `--accent-primary: #E8928E` (unchanged)
- Inner shadow: `rgba(200,200,255,0.25)`; drop shadow: `rgba(200,200,255,0.25)`.

Add new token + alias: `--highlight: var(--bg-highlight)` and Tailwind utility binding `--color-highlight: var(--highlight)` in the `@theme inline` block so `bg-highlight` works.

`--canvas / --surface / --surface-hover / --ink / --ink-2 / --hairline / --coral` aliases stay pointing at the same semantic slots so existing class usage keeps working — they just inherit the new hex values.

## 2. Copy uploaded assets into the project

- `user-uploads://File_plus.svg` → `src/assets/icon-file-plus.svg`
- `user-uploads://Icon_shapes.svg` → `src/assets/icon-shapes.svg`
- `user-uploads://Codesandbox.svg` → `src/assets/icon-codesandbox.svg`
- `user-uploads://icon_warning_L.svg` → `src/assets/icon-warning.svg`

Create a tiny `src/components/brand-icons.tsx` exporting `FilePlusIcon`, `ShapesIcon`, `CodesandboxIcon`, `WarningIcon` as inline React SVGs (same paths as the uploads) but with `stroke="currentColor"` instead of the hardcoded `#1A0003` / `#E8928E`. This lets us color them via Tailwind `text-*` classes (primary, ink, highlight).

## 3. Home page tiles (`src/routes/index.tsx`)

- Swap the Lucide `FilePlus` / `Shapes` / `Box` imports for the three brand icons above.
- Icon color on tiles: `text-coral` (primary). Drop the tinted square wrapper background and the top accent bar — the icon itself carries the color.
- `ActionTile` className change:
  - Remove `hover:-translate-y-0.5 transition-all duration-200` → use `transition-colors`.
  - Base bg: `bg-surface` (= `#FFF5F5` / `#140405`).
  - Hover bg: `hover:bg-highlight` (= `#FFFFFF` / `#6E4A4A`).
- Keep border + shadow as-is.

## 4. Header tabs (`src/routes/__root.tsx`)

Replace the Lucide `Database / BarChart3 / Sparkles` mapping with `{ FilePlusIcon, ShapesIcon, CodesandboxIcon }` from `brand-icons`. Render the icon (size 18) to the left of each label in the pill.

State styling per spec:
- **Inactive** tab: `text-ink` (icon + label both use text color), `hover:bg-highlight/40`.
- **Active** tab: `bg-coral text-ink` (icon + label still text color, primary as highlight bg).

Drop the current `text-ink-2` inactive and `bg-surface-hover/70` active treatments.

## 5. AI Analysis status icon

Wherever the AI-processing card shows the Codesandbox glyph (the live `runs.$runId.tsx` status panel, which is the implemented counterpart to screenshot 9):
- While `status !== "complete"` (processing/pending/running) → render `<CodesandboxIcon className="text-highlight" />`.
- When `status === "complete"` → `text-coral` (primary).

If the run page currently uses a `Box`/`Loader` glyph for the status hero, swap it for `CodesandboxIcon` with the conditional class above. No state-machine or polling changes.

## 6. Warning icon

Add `WarningIcon` to `brand-icons` already colored via `text-coral` by default (its source stroke is `#E8928E`, which equals primary — re-export it with `stroke="currentColor"` and document that callers should pass `className="text-coral"`). Not wired into any page yet — this just makes it available and on-brand when used.

## Files touched

- `src/styles.css` — token values for `:root` and `.dark`, add `--bg-highlight` + theme binding.
- `src/components/brand-icons.tsx` — NEW, four inline SVG components.
- `src/assets/icon-*.svg` — NEW, raw copies (kept for reference / future direct `<img>` use).
- `src/routes/index.tsx` — swap icons on `ActionTile`, remove translate hover, switch to `bg-surface → hover:bg-highlight`.
- `src/routes/__root.tsx` — swap tab icons, recolor active/inactive states.
- `src/routes/runs.$runId.tsx` — conditional Codesandbox icon color for processing vs complete.

## Not touched

- Supabase queries, route registrations, settings dialog logic.
- Locked accent (`--accent-primary` = `#E8928E`) — same in both modes.
- `src/components/ui/*` primitives.

After implementation I'll screenshot light + dark at the user's viewport to confirm: page bg = `#F2D0CF` / `#140F0F`, tiles hover to white / muted-rose, active tab pill is coral with dark text, processing icon is white-ish (highlight) and complete is coral.
