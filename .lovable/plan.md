## Home + nav visual polish

Scope: visual only. No tokens added, no queries/routes/functional logic touched. All colors come from existing CSS vars.

---

### 1. `src/routes/__root.tsx` — make the nav feel premium

- Thicken the pill: `h-12` → `h-14`, switch shadow from `0 2px 4px` to layered `0 1px 0 rgba(0,0,0,.04), 0 8px 24px -8px rgba(0,0,0,.18)` for a floating-glass feel.
- Add a 1px hairline border (`border-hairline`) on the pill so it reads as a defined surface against the pink canvas.
- Tab labels: bump weight `font-medium` → `font-semibold`, tighten tracking (`tracking-tight`), drop size to `[14px]` for editorial density.
- Active tab: replace the 18% coral wash + underline pill-bottom bar with a cleaner approach — solid `bg-surface-hover` chip + ink text (no bottom bar). Quieter, more confident.
- Brand "Lotus": keep lotus mark visible even when Home is active (small, 16px), wordmark in `font-semibold tracking-tight`.
- Account avatar: 1px coral ring → subtle `border-hairline-strong` ring; matches the new restrained tone.

### 2. `src/routes/index.tsx` — establish hierarchy and card presence

**Hero block**
- Lotus mark grows `h-8` → `h-10`, paired inline-left with the H1 instead of stacked (icon + heading on the same baseline).
- H1: `text-[28px]` → `text-[44px] font-bold tracking-[-0.02em] leading-[1.05]`. This is the single weight-carrying element on the page.
- Add an eyebrow above H1: small uppercase `text-[11px] tracking-[0.18em] text-ink-2` reading "Workbench" — editorial signal.
- Subtitle: bump to `text-[15px]`, max-width ~520px so it doesn't sprawl.
- Vertical rhythm: `mb-6` → `mb-12` between hero and action tiles.

**Action tiles (3 cards)**
- Make them feel like physical objects: `bg-surface` + `border border-hairline` + layered shadow (`0 1px 0 rgba(0,0,0,.04), 0 12px 32px -12px rgba(0,0,0,.25)`).
- Add a thin top accent stripe in `--coral` (2px, full-width inside rounded corners) to differentiate from the table rows below.
- Left-align icon + label instead of centered — feels more tool-like, less marketing.
- Icon in a coral-tinted square chip (`bg-coral/12`, rounded-lg, 40px), label `text-[15px] font-semibold`, add one-line description back in `text-[12.5px] text-ink-2`.
- Hover: lift `-translate-y-0.5` + shadow intensify (already there) + accent stripe brightens.

**Recent files section**
- Section header gets weight: H2 `text-[20px]` → `text-[22px] font-semibold`, paired with row count chip `text-[11px] text-ink-2 bg-surface border border-hairline rounded-full px-2 py-0.5` next to it.
- Wrap the entire table (header row + rows) in ONE container card: `bg-surface` + `border border-hairline` + soft shadow + `rounded-2xl` + `overflow-hidden`. This gives the table a defined surface vs. floating rows on pink.
- Inside the container, drop per-row shadows (no more puffy individual rows). Rows become flat with `border-b border-hairline` between them; last row no border.
- Row padding `py-4` → `py-3.5`, hover state `bg-surface-hover/40` (subtle) instead of translate.
- Column header row: keep uppercase tracked labels but slightly darker (`text-ink-2`), add `border-b border-hairline-strong` separator.
- Name column: file icon in coral tint (`text-coral` instead of `text-ink-2`) — adds color accent without breaking the palette.

**Page background**
- Add a very subtle vignette/radial behind the hero (`radial-gradient(ellipse at top, color-mix(in oklab, var(--bg-surface) 35%, transparent), transparent 60%)`) layered on the body bg — gives the home page a focal point and breaks the flat pink wash. Pure CSS, no new tokens.

---

### Files NOT touched

- `src/styles.css` (no token changes)
- `src/integrations/supabase/*` (no query changes)
- `src/routes/datasets.tsx`, `ai-analysis.tsx`, `runs.$runId.tsx`, `visualisation.tsx` (out of scope — Home + nav only)
- `src/routeTree.gen.ts`

---

### Net effect

- Nav: thinner border + softer shadow + active-chip pattern reads premium, not marketing-y.
- Home: one strong H1, three differentiated tool tiles with accent stripes, and a unified recent-files card. Hierarchy goes hero → tiles → table instead of three equally-weighted flat zones.

Approve and I'll apply in one pass.