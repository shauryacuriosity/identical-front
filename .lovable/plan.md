# Home banner + depth shadow fix

Three small, contained changes — tokens, header, home page. No data/route logic touched.

## 1. Add depth-shadow tokens (`src/styles.css`)

Add new tokens for the user-specified shadow color pair (drop + inner, X:0 Y:10 blur:7 spread:0), themed per mode.

Light (`:root`):
- `--shadow-drop-color: rgba(0, 0, 0, 0.25);`
- `--shadow-inner-color: rgba(255, 255, 255, 0.25);`

Dark (`.dark`):
- `--shadow-drop-color: rgba(200, 200, 255, 0.25);`
- `--shadow-inner-color: rgba(200, 200, 255, 0.25);`

Composite (both modes, defined once in `:root` using the variables):
```
--shadow-depth:
  0 10px 7px 0 var(--shadow-drop-color),
  inset 0 10px 7px 0 var(--shadow-inner-color);
```

Usage in components: `style={{ boxShadow: "var(--shadow-depth)" }}`.

## 2. Header "Lotus" brand pill (`src/routes/__root.tsx`)

The brand/home `<Link to="/">` currently uses `bg-surface-hover/70` when `homeActive`. Change it to match the other active tabs:

- Active (`homeActive === true`): `bg-coral text-ink`
- Inactive: `text-ink hover:bg-highlight/50` (mirrors the other tabs)

Also replace the nav pill's hand-tuned `boxShadow` string with `var(--shadow-depth)` so the header gets the same depth treatment as other prominent elements.

## 3. Home page — remove outer "banner" + apply depth shadow (`src/routes/index.tsx`)

- Delete the `style={{ backgroundImage: "radial-gradient(...)" }}` on the outer `<div className="relative">` wrapper. This is the ghost secondary banner the user is seeing — a radial gradient bleeding behind the hero area. Wrapper becomes a plain `<div className="relative">`.
- Replace the two existing custom `boxShadow` strings (on `ActionTile` and on the Recent files card) with `var(--shadow-depth)` so every prominent surface uses the same depth recipe.

## Files touched

- `src/styles.css` — add `--shadow-drop-color`, `--shadow-inner-color` (light + dark) and `--shadow-depth` composite.
- `src/routes/__root.tsx` — recolor active brand link to `bg-coral`; swap nav pill shadow to `var(--shadow-depth)`.
- `src/routes/index.tsx` — remove radial-gradient wrapper style; swap tile + table shadows to `var(--shadow-depth)`.

## Not touched

- Tabs styling (already correct per previous turn).
- Tokens for palette, accent, borders.
- Any data fetching, routes, or settings dialog.

After implementation I'll screenshot `/` in both light and dark to confirm: no outer halo behind the hero, the "Lotus" pill turns coral on `/`, and tiles + nav + recent-files card all carry the same drop+inner depth.
