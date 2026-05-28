# UI polish changelog (Wave 3 — D2)

Agent D2 — contrast, depth, focus rings. **Do not commit from this agent.**

## Before → after

### Text contrast (pink-on-pink)

| Token | Before | After | Worst-case bg | Ratio (before → after) |
|-------|--------|-------|---------------|------------------------|
| `--text-muted` / `ink-2` | `#5c3838` | `#4A2828` | `--bg-emphasis` | 4.65:1 → **5.95:1** |
| `--text-tertiary` / `ink-3` | `#7a4f4f` | `#623838` | `--bg-emphasis` | 3.16:1 → **4.51:1** |
| `text-coral` (icons, links) | `#E8928E` on pink | `#9A3C38` via `--coral-ink` | `--bg-page` | 2.20:1 → **4.78:1** |
| `bg-coral` (nav pills, buttons) | unchanged | `#E8928E` | — | Dark `text-ink` on pill stays **8.5:1** |

`text-coral` now maps to `--coral-ink` while `bg-coral` keeps the soft accent fill — icons and inline links are readable without changing active-tab styling.

### Borders

| Token | Before | After | On `--bg-surface` |
|-------|--------|-------|-------------------|
| `--border-muted` / `hairline` | `#C49090` | `#9A6363` | 2.54:1 → **4.52:1** |
| `--border-default` / `hairline-strong` | `#A06B6B` | `#7A4545` | 3.39:1 → **7.10:1** |

### Shadow scale (single source of truth)

| Utility | Use |
|---------|-----|
| `--shadow-xs` / `.shadow-xs` | Segmented controls, subtle chips |
| `--shadow-sm` / `.shadow-sm` | Inputs, small buttons |
| `--shadow-card` / `.shadow-card` | Tables, sidebars, shadcn `Card` |
| `--shadow-action` / `.shadow-action` | Home action tiles (replace inline rgba when D1 touches `index.tsx`) |
| `--shadow-md` / `.shadow-elevated` | Dropdowns, popovers |
| `--shadow-lg` | Menus, large overlays |
| `--shadow-depth` / `.shadow-depth` | Floating header nav pill |

Removed duplicate `--shadow-lg: var(--shadow-elevated)` aliasing; each step is distinct.

### Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-card` | `var(--radius-2xl)` (~22px) | Cards, table shells — matches Home |
| `--radius-control` | `var(--radius-lg)` (~14px) | Inputs, buttons |
| `.rounded-card` | utility | shadcn `Card` now uses this |

### Focus rings

- `--ring` → `--coral-deep` (was bright coral) so shadcn `ring-ring` on inputs/selects is visible.
- Global `:focus-visible` uses 2px `--coral-deep` outline on links, buttons, roles, form controls.
- Header nav + mobile bottom nav + table interactives get explicit focus rules (works even when routes use `focus:outline-none`).
- Form controls also set `border-color: coral-deep` on `:focus-visible`.

## Files modified

| File | Change |
|------|--------|
| `src/styles.css` | Token darkening, shadow scale, coral-ink split, focus/radius utilities |
| `src/components/ui/card.tsx` | `rounded-card` + `shadow-card` |
| `src/components/ui/table.tsx` | `data-slot="table"` for focus selectors |
| `src/components/mobile-bottom-nav.tsx` | Tailwind shadow class (removed inline style) |
| `UI_POLISH.md` | This changelog |

## Conflict notes vs D1

| Area | D1 owns | D2 did | Merge guidance |
|------|---------|--------|----------------|
| `__root.tsx` | Layout, responsive nav classes | CSS-only focus on `header nav` | Safe — no TSX overlap |
| `index.tsx` | Responsive grid, touch targets | Token shadows; inline tile shadow still present | D1 can swap tile `style={{ boxShadow }}` → `shadow-action` |
| `datasets.tsx` / `ai-analysis.tsx` | Route logic, responsive classes | Global tokens apply automatically | `shadow-[var(--shadow-*)]` refs pick up new values |
| Auth routes | D1 layout | Not touched | — |

## Not changed

- eAsia / Lotus palette family (coral pink canvas, Montserrat, brand marks).
- Route business logic or layout structure in owned D1 files.
- `--accent-primary` decorative tints (`color-mix` backgrounds unchanged).

## Verification checklist

- [x] Primary text (`ink`) ≥ 14:1 on page/surface
- [x] Secondary text (`ink-2`, `ink-3`) ≥ 4.5:1 on emphasis hover rows
- [x] `text-coral` ≥ 4.5:1 on surface/page
- [x] UI borders ≥ 3:1 on surface
- [x] One documented shadow scale
- [ ] Spot-check Home at 1280px in browser (manual)
