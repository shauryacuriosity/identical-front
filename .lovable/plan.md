## Visual polish pass — plan

Scope: className/style tweaks only. No logic, no token, no route, no query changes.

---

### File 1 — `src/routes/index.tsx` (items 1, 2, 4)

**1. Restore Lotus brand on Home hero (item 1).**
Add the lotus mark above the "Welcome back" heading inside the greeting block (line ~234). Import `lotusMark from "@/assets/logo_lotus.png"` and render `<img src={lotusMark} alt="" className="h-8 w-auto mb-3" />`. No wordmark — the page already says "Welcome back" as the H1, and the nav already shows "Lotus". This restores the visual brand presence on `/` without duplicating the wordmark.

**2. Re-soften secondary text (item 2).** Surgical reverts:

- `text-ink` → `text-ink-2` on:
  - greeting subtitle "Pick up where you left off…" (line 237)
  - Recent files header timestamps cell `f.modified` (line 351)
  - Recent files rows count cell (line 343) and prevalence cell (line 347) — these are tabular supporting data, not body content
- Keep `text-ink` on: H1 "Welcome back" (236), H2 "Recent files" (249), file name (336), ActionTile label (103).
- Column header row (line 254) already uses `text-ink-2` — leave as is.

**4. Card surfaces (item 4).** Recent files rows + skeleton already use `bg-surface` (cream #FFF5F5). Verify and leave untouched. No change needed unless an inline white snuck in — none found in this file.

---

### File 2 — `src/routes/__root.tsx` (item 3)

**Match Home pill to tab system.** Currently the Home brand link uses `pl-2 pr-4` while tabs use `px-4` — that asymmetry makes the Home pill feel different. Fix:

- Change brand link className from `pr-4 pl-2 h-9 my-auto rounded-2xl` → `px-4 h-9 my-auto rounded-2xl` for symmetric padding identical to tab triggers.
- Keep coral 18% background, keep `left-3 right-3 bottom-1 h-[2px]` underline — already identical to tabs.
- Keep `homeActive && hide lotus icon` behavior so text-only "Lotus" sits inside the coral pill at the same visual weight as other tab labels.

No new protrusion below the nav bar — the existing underline pattern (inside the pill, 1px above bottom) is the system used by every other tab; matching it is the goal.

---

### File 3 — `src/routes/datasets.tsx` (items 2, 5 audit)

Surgical sweep only — open the file, identify any place where the prior pass turned muted labels into `text-ink`, and revert per item 2 rules:

- attribute group counts/badges → `text-ink-2`
- sidebar section labels & filter placeholder helper text → `text-ink-2`
- pipeline step parts (descriptive sub-text) → `text-ink-2`
- dataset bar metadata (row counts, file size) → `text-ink-2`
- Keep `text-ink` on: page H1, attribute names, dataset bar name, pipeline operation labels.

Item 5 audit: scan for any `rounded-none` / missing radius on buttons added in the last pass (the `+` appender, List/Compact toggle, search input). Ensure each uses `rounded-lg` (toggles) or `rounded-xl` (dataset bars / +). Restore if missing.

---

### File 4 — `src/routes/ai-analysis.tsx` (items 2, 5 audit)

Same surgical sweep:

- Step numbers / step descriptions / helper sublabels → `text-ink-2`
- Mapping row field labels → `text-ink-2`
- Run name input label may stay `text-ink` (item 12 promoted it intentionally — leave as is)
- Add field button, dropdowns, chevron buttons: verify `rounded-lg`/`rounded-xl` matches the rest of the form. Restore if any went flat.

---

### Sanity checks

1. **Lotus on Home** — adding only the icon (~32px), no wordmark, above the H1. Confirm that placement vs. inline-with-H1 (icon + text side-by-side).
2. **Muted reversion scope** — applying only to: timestamps, secondary metadata, helper sublabels, column headers, breadcrumbs, step descriptions. Body paragraphs and table primary identifiers stay `text-ink`. Confirm.
3. **No token changes** — `text-ink` (#1A0003) and `text-ink-2` (#673D3D) classes already exist in styles.css; this is class swaps only.

---

### Files I will NOT touch

- `src/styles.css`, `src/integrations/supabase/*`, `src/routeTree.gen.ts`
- `src/routes/runs.$runId.tsx`, `src/routes/ai-analysis.results.tsx`, `src/routes/visualisation.tsx` (not in the scope of the recent 13-item pass)

Approve and I'll apply all four files in one pass.  
approving -- please make it look good, without changing all of the explicit rules mentioned earlier. it should be a small polish pass. :) 