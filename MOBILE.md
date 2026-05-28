# Lotus mobile responsive pass (D1)

Viewport notes for capstone demos. Layout-only changes — no brand token edits (`src/styles.css` is owned by D2).

## Breakpoints tested

| Width | Device class | Notes |
|-------|----------------|-------|
| **390px** | iPhone 14 / narrow phone | Primary success target: no page-level horizontal overflow on Home, Datasets, AI Analysis |
| **768px** | Tablet portrait | Sidebars stack; project table uses card layout below `md` (768px) |
| **1280px** | Desktop / demo laptop | Full pill nav + 280px sidebars + 5-column project table |

## What changed

### Navigation (`src/routes/__root.tsx`)

- Top pill nav: compact height on mobile; tab labels hidden below `lg` (1024px).
- **Mobile bottom bar** (`src/components/mobile-bottom-nav.tsx`): Home, Datasets, Charts, AI — fixed at bottom with safe-area padding; main content gets `pb-20` below `lg`.
- Auth unchanged: `AuthProvider`, `AuthGate`, `setAuthTokenGetter`, `signOut`, session loading — public auth routes still render without header/bottom nav.
- Account menu + desktop tab links: **44px** minimum touch targets (`min-h-[44px]` / `h-11`).
- Settings dialog: single column on phone, two columns from `sm`.

### Home (`src/routes/index.tsx`)

- Page padding `px-4` on phone; greeting scales `32px` → `44px` title.
- **Recent projects**: card list below `md` (no 5-column grid squeeze); table + optional inner scroll from `md` up.
- Retry CTA: `min-h-11`.

### Datasets (`src/routes/datasets.tsx`)

- Attributes sidebar: full width, stacks **above** main pipeline on `< lg`; sticky only on desktop.
- Collapsed max-height on mobile so attributes panel does not dominate the viewport.
- Add dataset / Import / Export / Visualise: `min-h-11` touch targets.
- Add/Import buttons stack vertically on narrow screens.

### Visualisation (`src/routes/visualisation.tsx`)

- Chart builder rail stacks below chart canvas on `< lg` (chart first via `order-1`).
- Project select: full width on phone.
- Chart type tiles: `min-h-11`.

### AI Analysis (`src/routes/ai-analysis.tsx`)

- Layout only; preserved markers: `/* C3:BANNER */`, `/* C3:MOCK_GUARD */`, cohort slider + C2 descriptions.
- Step indicator: horizontal scroll on narrow screens; step labels hidden below `sm`.
- Field mapping rows: stack on phone (label → column picker → confidence).
- Age range slider: larger thumbs via layout wrapper (`[&_[role=slider]]:h-5`).
- Primary CTAs (Continue, Run Analysis): `h-11` / 44px.

### Run results (`src/routes/runs.$runId.tsx`)

- Responsive padding; SHAP bars use flexible first column on phone.
- Pagination and Start/Retry: `min-h-11`.

## Verify locally

1. `pnpm dev` (or project dev command).
2. Open DevTools → device toolbar:
   - **390×844** — Home, `/datasets`, `/ai-analysis`: no sideways page scroll; bottom nav visible when logged in.
   - **768×1024** — Datasets attributes panel above pipeline; AI cohort two-column where space allows.
   - **1280×800** — Desktop nav tabs + side-by-side sidebars.
3. Production spot-check: https://identical-front.vercel.app (after deploy).

## Conflict notes

| Agent | File / area | D1 scope | Avoid |
|-------|-------------|----------|--------|
| **B1** | `src/lib/auth.tsx`, login/signup/forgot-password | Do not edit | Auth logic and public routes |
| **B1** | `__root.tsx` `AuthProvider` / `AuthGate` blocks | Touch only nav/shell layout | Redirect or session behavior |
| **D2** | `src/styles.css`, global tokens, focus-ring tokens | Do not edit | Color/contrast/shadow scale |
| **C2/C3** | `ai-analysis.tsx` banner + mock guard regions | Layout around blocks only | Do not remove `C3:BANNER` / `C3:MOCK_GUARD` comments or change mock guard logic |

## Files modified (D1)

- `src/routes/__root.tsx`
- `src/components/mobile-bottom-nav.tsx` (used by root; not in original list but required for mobile nav)
- `src/routes/index.tsx`
- `src/routes/datasets.tsx`
- `src/routes/visualisation.tsx`
- `src/routes/ai-analysis.tsx`
- `src/routes/runs.$runId.tsx`
- `MOBILE.md` (this file)
