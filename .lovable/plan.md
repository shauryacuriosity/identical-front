## Top nav polish — two corrections

Single file edited: `src/routes/__root.tsx` (`AppHeader` only). One new asset copied in: `src/assets/logo_lotus.png` (already on disk from the upload). No token changes. No edits to page background, action cards, recent files, welcome heading, or any data wiring.

---

### 1. Active tab indicator — shrink + tuck under

Current: a 56×56 rounded-2xl coral square positioned at `-bottom-3` and starting `pt-2.5`, which makes it overhang both above and below the 48px bar and read as a giant detached badge.

New shape:
- Width ≈ 64px, height ≈ 40px (matches the visual rhythm of inactive tabs).
- Top edge aligned with the top of the 48px nav bar (`top: 0`), bottom edge protrudes ~14px below the bar (`-bottom-3.5`).
- `border-radius: 2px 2px 16px 16px` — square top corners that tuck into the bar, rounded bottom corners that hang below.
- Fill `var(--accent-primary)` (#E8928E), drop shadow `0 2px 4px rgba(0,0,0,0.25)`.
- Icon: 18px white, `strokeWidth={2}`, centered vertically within the bar's height (not pushed to the bottom hanging area). Use `flex items-center justify-center` on the inner element and offset the icon up so it sits inside the bar portion, not the hanging lip.

### 2. Bring Lotus wordmark and UOW eAsia inside the pill

Today the wordmark sits in its own div to the left of the pill, and the workspace+avatar live inside the pill on the right. Result: wordmark floats loose on pink.

Restructure `AppHeader` so the outer container is a single pill bar containing, left → right:

```text
[Lotus mark + word]  [Home tab][Datasets][Visualisation][AI Analysis]   …spacer…   [UOW eAsia]  [avatar]
```

- Remove the separate wordmark div outside the `<nav>`.
- Inside the nav, first child becomes a small brand cluster: 18px lotus icon (`src/assets/logo_lotus.png`, `h-[18px] w-auto`) + "Lotus" label (Montserrat 600, 16px, `text-ink`, `tracking-tight`). Left padding `pl-4`, right padding before the first tab `pr-5`. Vertically centered.
- Tabs group stays as today (gap-1), now sitting immediately after the brand cluster instead of at the pill's left edge.
- Right side stays as today: "UOW eAsia" button (13px, `text-ink`, `font-medium`) + avatar circle (`h-9 w-9`, coral 2px ring). Right padding `pr-3`. `ml-auto` keeps it pinned right.
- The pill keeps: `h-12`, `bg-surface`, `rounded-full`, `shadow: 0 2px 4px rgba(0,0,0,0.25)`, max container width 1280px.

### Files

- `src/routes/__root.tsx` — `AppHeader` only; restructure children, replace active-tab span styling per above, add `import lotusMark from "@/assets/logo_lotus.png"`.
- `src/assets/logo_lotus.png` — already copied from the upload.

### Untouched

Page background, ActionTile cards, Recent Files table + columns, welcome heading, AI Analysis 4-step internals, Datasets workspace, all hooks/queries/state, all tokens in `src/styles.css`, all chart series.
