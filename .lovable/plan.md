## Scope
Two small changes to the floating header in `src/routes/__root.tsx` plus a shadow-token update in `src/styles.css`.

## Changes

### 1. `src/routes/__root.tsx` — `AppHeader`
- Remove the outer "banner" wrapper styling on the `<header>`. Currently: `sticky top-0 z-30 pt-4 pb-2 px-6 bg-canvas/85 backdrop-blur-md`. Drop `bg-canvas/85 backdrop-blur-md` so the page background shows through and the pill nav reads as a single floating element (no second band encapsulating it). Keep `sticky top-0 z-30` and the padding so layout doesn't shift.
- Confirm the Lotus/Home brand link uses the same active treatment as the tab buttons. It maps to `bg-coral` on `homeActive` (same token as the other tabs' active state) and `hover:bg-highlight/50` on hover — verify className strings match exactly so highlight color, height (`h-10`), radius (`rounded-full`), and transitions are identical between Home and the other tabs.

### 2. `src/styles.css` — shadow token
Replace `--shadow-depth` with the spec values:

```
--shadow-depth:
  0 10px 7px 0 var(--shadow-drop-color),
  inset 0 10px 7px 0 var(--shadow-inner-color);
```

X:0, Y:10, blur:7, spread:0 — drop + inner using the existing `--shadow-drop-color` / `--shadow-inner-color` vars (already theme-aware light/dark). The pill nav already references `boxShadow: "var(--shadow-depth)"` so it picks this up immediately, and this becomes the canonical depth token to reuse on other prominent elements per your rule.

## Out of scope
- No changes to tab structure, dropdown, or settings dialog.
- No retroactive application of the new shadow to other page elements yet — token is ready when you point me at specific elements.
- No color-token changes; drop/inner shadow colors stay as their existing CSS variables.
