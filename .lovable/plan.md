## Goal

Keep your team's warm coral/peach identity (it's actually a strength — nothing else in scientific tooling looks like this), but elevate it from "Figma student project" to "tool a public-health researcher would trust with NHANES data." Same screens, same flows. Surgical visual upgrades.

## Why the current design reads as student work

1. **Flat pink wash everywhere** — no surface hierarchy. The eye doesn't know what's primary vs. secondary.
2. **Tabs sit awkwardly inside the window chrome** — fake macOS frame fights with the actual app.
3. **Cards float without anchoring** — uniform shadows, no edges, no structure.
4. **Single weight of pink** — active tab, primary button, and accent dots are all the same coral. No system.
5. **Inputs look like buttons, buttons look like cards** — components aren't differentiated.
6. **Typography is one size fits all** — serif heading is nice, but no rhythm in the body.
7. **Empty states say "preview of resulting table"** — no guidance for a researcher who just opened it.

## The redesign direction

**Concept:** *Warm laboratory.* Think Italian stationery brand meets statistical notebook. Coral stays as the human warmth; everything else gets quieter and more precise so data can breathe.

### 1. Color system — refine, don't replace

Move from one pink to a layered system:

- **Canvas:** very soft warm off-white (`oklch(0.985 0.008 40)`) — not pink wash, just *warm paper*
- **Surface ambient:** subtle peach gradient only at top edge (40% → 0%), so the page has warmth without drowning content
- **Card:** pure warm white with a 1px hairline border (`oklch(0.92 0.015 40)`) — replaces the "everything floats" look
- **Coral primary:** keep the existing tone, reserve it strictly for: active nav, primary CTA, selection state
- **Coral muted:** 15% tint for hover/secondary surfaces
- **Ink:** near-black with warm undertone for text; 3 levels (primary / secondary / tertiary)
- **Data accent palette:** add 4 supporting colors (sage, ochre, slate, plum) for charts and category tags — researchers need this

### 2. Typography rhythm

- Keep **Fraunces** for display, but use it more deliberately: only page titles and key numbers
- **Inter Tight** for UI, **Inter** for body, **JJ Mono** (or JetBrains Mono) for column names, IDs, and code-like values (`SEQN`, `DR1EXMER` etc. should be monospace — that's a researcher signal)
- Tighter type scale: 32 / 24 / 18 / 15 / 13 / 11 with proper line-heights
- Numeric tabular figures everywhere data appears

### 3. Remove the fake macOS chrome

The traffic-light dots and "eAsia App" titlebar from the mockups are Figma artifacts. In a real web app they look amateur. Replace with a slim app header:
- Wordmark "eAsia" (Fraunces) on the left
- Tabs centered, underline-indicator style instead of tab-into-card
- Profile + workspace switcher right
- 1px bottom border, no fake window

### 4. Per-screen refinements

**Home**
- Drop the three giant card buttons in favor of a tighter quick-actions row + a real *workspace summary* (recent files becomes the hero, not an afterthought)
- Recent files: add metadata columns (rows, modified, owner), filterable, sortable. Replace the radio dot with a status pill (`active` / `archived`)
- Add a subtle "Getting started" sidebar card with 3 steps for first-time users

**Datasets**
- The current join/aggregate/sort/filter row is the strongest screen — keep its bones
- Replace the four "Select" dropdowns with a **pipeline builder strip**: chips that read like a sentence ("Join `Dataset_A` to `Dataset_B` on `SEQN` (Inner) → Aggregate `level_sugar` by Mean → Sort Descending → Filter `age > 40`"). Click any chip to edit. This is the single biggest "wow" upgrade.
- Attribute sidebar: group by data type (numeric / categorical / identifier), show type icons, search box at top, count badge per group
- Empty preview area: render a real shadcn `<Table>` skeleton with placeholder rows so it doesn't feel hollow
- Save / Export become a sticky footer bar with row count + last-saved timestamp

**Visualisation & AI Analysis**
- Currently just title screens. Add a proper empty state: illustration + 3 example prompts ("Distribution of sugar intake by age group", "Correlation of blood pressure and sodium")
- Keeps scope minimal but signals depth

### 5. Components — the small things that signal quality

- **Dropdowns:** add 1px border, soft inner shadow, chevron rotates on open, options have hover bg + check on selected
- **Checkboxes:** custom — coral fill with white check when active, hairline border when inactive
- **Buttons:** 3 variants (primary coral filled, secondary white with border, ghost) — currently they all look the same
- **Cards:** hairline border + minimal shadow instead of heavy drop shadow. Subtle on hover.
- **Focus rings:** coral, 2px offset — currently invisible (accessibility)
- **Loading states:** skeleton shimmer in warm tone
- **Empty states:** every screen gets one with icon + message + primary action

### 6. Micro-interactions

- 150ms ease-out on all hovers, 200ms on tab switches
- Tabs slide a coral underline between items (not the current "tab pops up")
- Dropdowns fade+translate-y-1 on open
- Cards lift 1px on hover with shadow softening
- Number values tick-animate when filters change

### 7. Layout & spacing

- Adopt an 8px base unit, currently spacing is ad-hoc
- Max content width 1280px centered (currently full-bleed feels chaotic on wide monitors)
- Sidebar width 280px (currently 256px, feels cramped with monospace column names)

## Scope

- `src/styles.css` — new token system (canvas, surfaces, ink levels, data accents, semantic shadows)
- `src/routes/__root.tsx` — replace fake macOS chrome with proper app header
- `src/routes/index.tsx` — restructured Home with real recent-files table
- `src/routes/datasets.tsx` — pipeline-chip builder, refined sidebar, sticky footer, table skeleton
- `src/routes/visualisation.tsx` + `ai-analysis.tsx` — proper empty states
- New shared components in `src/components/`: `AppHeader`, `PipelineChip`, `AttributeTree`, `EmptyState`, `DataTable`
- Refine shadcn `button`, `dropdown-menu`, `checkbox`, `card` variants to match tokens

Out of scope: any backend, real data parsing, the Visualisation/AI Analysis feature builds themselves — only their visual shells.

## Suggested rollout

I'd recommend doing this in 2 passes so you can react between them:

1. **Pass 1 — Foundation (1 prompt):** new color tokens, typography, app header, button/card/dropdown refinements. Every screen instantly looks 70% better.
2. **Pass 2 — Screen polish (1 prompt):** Home recent-files table, Datasets pipeline chips + sidebar + sticky footer, empty states.

Approve this and I'll start with Pass 1.
