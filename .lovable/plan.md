## Corrective styling pass — light-mode tokens from Adrian's Figma Variables

> **Why this pass exists.** The previous pass used the wrong hex values — Adrian's Variables panel has separate light and dark mode columns, and we accidentally pulled from the dark-mode column. The result is bleached secondary text (`#d4908a`), grey borders that don't belong in this palette, and an underline-only active tab. This plan replaces tokens only. **No structure, layout, copy, or component changes.**

There is no `tailwind.config.ts` in this project — Tailwind v4 reads tokens from `src/styles.css` via `@theme inline`. All token work happens in that one file. Component-level fixes are limited to (a) the active-tab nav indicator and (b) the body heading weight bump, both single-line tweaks.

---

### 1. Token rewrite in `src/styles.css`

Replace the current `:root` block with Adrian's **light-mode column** values. New names match Adrian's panel; old names are aliased to the new ones so existing class usages (`bg-canvas`, `bg-surface-hover`, `text-ink-2`, `text-ink-3`, `border-hairline`, `bg-coral`, etc.) keep working without touching any component file.

```text
/* Backgrounds */
--bg-page:      #FFF5F5      (was --canvas)
--bg-surface:   #FFF5F5      (was --surface #FFFFFF — surface now equals page; depth via borders + bg-elevated, not contrast)
--bg-elevated:  #F2D0CF      (was --surface-hover #F9D7D7 — used for hover, dropdown rows, active tab pill, selected pill)
--bg-emphasis:  #CAA8A7      (new — pressed/selected emphasis)

/* Brand */
--accent-primary:   #E8928E  (was --coral — unchanged hex, renamed)
--accent-secondary: #0077FF  (new — defined, currently unused)
--accent-highlight: #FFFFFF  (new — white highlight token)

/* Text — biggest visible fix */
--text-primary: #1A0003      (was --ink #1E1E1E — near-black with red undertone)
--text-muted:   #673D3D      (was --ink-2 #5A4A4A AND --ink-3 #D4908A — collapses to one dark muted brown-red)

/* Borders — switch from grey to muted pink */
--border-default: #A06B6B    (was --hairline rgba(110,74,74,0.12))
--border-muted:   #C49090    (was --hairline-strong)
/* drop --hairline-grey #D9D9D9 entirely */

/* Status — unchanged hexes, confirmed correct */
--status-success: #7AAB8A
--status-warning: #9A9268
--status-danger:  #C08880
--status-info:    #7A9DC4

/* Shadows — Adrian's drop_shadow at 25% black, retinted to red-black */
--shadow-card:     0 2px 8px rgba(26, 0, 3, 0.06)
--shadow-elevated: 0 8px 24px rgba(26, 0, 3, 0.10)

/* Type — unchanged */
--font-base: 'Montserrat', system-ui, sans-serif
```

**Backwards-compat aliases (added at end of `:root`)** so no component file needs renaming:

```text
--canvas         → var(--bg-page)
--surface        → var(--bg-surface)
--surface-hover  → var(--bg-elevated)
--ink            → var(--text-primary)
--ink-2          → var(--text-muted)
--ink-3          → var(--text-muted)        /* collapsed — was the wrong bleached pink */
--coral          → var(--accent-primary)
--coral-hover    → var(--bg-emphasis)
--coral-deep     → var(--text-primary)
--coral-muted    → var(--text-muted)
--hairline       → var(--border-default)
--hairline-strong→ var(--border-default)
--hairline-grey  → var(--border-muted)      /* anywhere this was used switches to pink-toned */
--shadow-sm      → var(--shadow-card)
--shadow-md      → var(--shadow-elevated)
--shadow-lg      → var(--shadow-elevated)
```

This is the only file edited for tokens. Chart data tokens (`--data-sage/ochre/slate/plum`) stay as-is.

---

### 2. Two component-level touch-ups

**a. Active tab indicator — `src/routes/__root.tsx` lines 73–78.** Today the active tab is an underline-only:

```text
<span className="absolute left-3 right-3 bottom-0 h-[2px] bg-coral rounded-full" />
```

Replace with a pink pill background using `--bg-elevated` behind the label, label in `--text-primary`:

```text
className="relative h-14 px-1 flex items-center text-[13.5px] font-medium"
<span className={active
  ? "px-3 py-1.5 rounded-full bg-surface-hover text-ink"   /* surface-hover now resolves to #F2D0CF */
  : "px-3 py-1.5 text-ink-2 hover:text-ink"}>
  {t.label}
</span>
/* underline removed */
```

**b. Heading weight bump — `src/styles.css` lines 148–156.** Bump h1/h2 from `font-weight: 600` to `700` with `letter-spacing: -0.01em` to give display titles the heft Adrian gets from a serif. h3 stays at 500.

---

### 3. The 5 critical visual fixes, confirmed

| # | Fix | How it lands |
|---|---|---|
| 1 | **Active tab = pink pill, not underline** | `__root.tsx` swap above; `--bg-elevated` #F2D0CF behind active label |
| 2 | **Muted text = dark brown-red, not bleached pink** | `--ink-2` and `--ink-3` both alias to `--text-muted` #673D3D. Every `text-ink-2` / `text-ink-3` usage across all routes flips automatically |
| 3 | **Borders = pink-toned, not grey** | `--hairline` aliases to #A06B6B, `--hairline-grey` aliases to #C49090. All `border-hairline` / `border-hairline-grey` / `border-hairline-strong` classes get pink tone with zero component edits |
| 4 | **Card surfaces = more pink presence** | `--surface-hover` resolves to #F2D0CF (was #F9D7D7), strengthening hover states, icon-container chips, selected pills, dropdown row highlights, action card chip backgrounds |
| 5 | **Heading weight up** | h1/h2 → 700 with -0.01em tracking |

---

### 4. What stays unchanged

- All page layouts, component hierarchies, route files (except the 6-line active-tab tweak)
- 4-step AI Analysis workflow (Map / Cohort / Method / Run), function-mode chip group, Method sections, NCEP annotation
- Results dashboard 4-panel composition
- Datasets pipeline sentence header
- Home Recent-as-hero with TYPE / MetS prevalence columns
- All copy, all data, all interactions, all chart series colors
- Font choices (Montserrat + JetBrains Mono) — already correct from previous pass

---

### Scope summary

- **Files edited: 2**
  - `src/styles.css` — token rewrite + alias layer + h1/h2 weight bump
  - `src/routes/__root.tsx` — active-tab pill (6 lines)
- **Files NOT edited:** every other route, every component, every chart, every icon. The alias layer means `bg-canvas`, `text-ink-2`, `border-hairline`, `bg-coral`, etc. resolve to the new correct values without renaming a single class.

This is purely a corrective pass — no other changes.
