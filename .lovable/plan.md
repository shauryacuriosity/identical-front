Three small, contained fixes — all visual / state wiring, no query or token changes.

## 1. Recent files: remove the status dot

In `src/routes/index.tsx`, the leading cell currently swaps a `StatusDot` for a `RowCheckbox` on hover/selection. Drop the dot entirely and render the `RowCheckbox` permanently for every row (same component already used in the header for "select all"). Result: a normal selection column, no animated swap.

- Delete the two stacked `<span>`s and the `StatusDot` usage in the row.
- Keep the `RowCheckbox` (always visible, `checked={isSelected}`, `onChange={() => toggleOne(f.id)}`).
- Leave `StatusDot` import/declaration in place if unused elsewhere — safer than ripping out and risking an unused-import flag; I'll remove it only if it's truly orphaned.

## 2. Dark mode toggle — make the switch actually flip + give the theme something to do

Two problems today:

a. **The switch UI doesn't visibly move.** The current `className` override on `<Switch>` (`h-6 w-11 [&>span]:h-5 [&>span]:w-5 [&>span]:data-[state=checked]:translate-x-5`) fights the thumb's built-in `translate-x-4`. Fix by either (i) dropping the custom size override and letting the default `h-5 w-9` switch render cleanly, or (ii) restyling via a small wrapper that sets thumb translate to match. I'll go with (i) — simpler, matches the prototype's pink pill feel via `data-[state=checked]:bg-coral data-[state=unchecked]:bg-coral-muted/40` only, no size overrides. The thumb already animates correctly at default size.

b. **Toggling `.dark` does almost nothing visually** because `src/styles.css` only redefines `--background` and `--foreground` under `.dark` — every other semantic token stays light. Add a proper dark override block under the existing `.dark { … }` selector that remaps the semantic tokens (canvas, surface, surface-hover, ink, ink-2, hairline, coral stays the same, etc.) to dark-mode values derived from the existing accent. This is a token *addition* under `.dark`, not a change to the locked light palette — the user's earlier "don't touch tokens" rule was about the light palette and is preserved.

   Dark values (semantic, no new accent hex — coral stays the same so brand carries through):
   - `--bg-page: #1A0E0F` (very dark warm)
   - `--bg-surface: #261617`
   - `--bg-emphasis: #3A2122`
   - `--text-primary: #FFF5F5`
   - `--text-muted: #C49090`
   - `--border-default: #4A2A2B`
   - `--border-muted: #3A2122`
   - Keep `--accent-primary` (coral) the same so buttons / links still pop.

## 3. Header drop shadow: contain it to the pill, not the page

In `src/routes/__root.tsx`, the `<header>` is `sticky top-0 z-30 pt-4 pb-2 px-6` with no background — but on scroll the pill's `0 8px 24px -10px` shadow visually reads as a band across the page because there's nothing clipping it and the header has no rounding of its own.

Fix on the **nav element only** (the pill):
- Tighten the shadow so it hugs the pill: replace the current two-layer shadow with a softer, smaller-radius one — `box-shadow: 0 2px 8px -4px rgba(0,0,0,0.12), 0 8px 20px -12px rgba(0,0,0,0.18)`. Smaller spread + tighter offset = shadow stays inside the pill's footprint and follows its rounded shape (shadows are always clipped to the element's border-radius, so the pill's `rounded-full` already shapes it — the previous values were just too wide).
- No background or shadow added to the outer `<header>` — that's what was making it feel like a full-width bar.

After the edit I'll capture a screenshot at the user's viewport (1773px) to verify the shadow now reads as belonging to the pill, and that toggling dark mode actually changes the page.

## Files touched

- `src/routes/index.tsx` — remove dot swap, always render checkbox.
- `src/routes/__root.tsx` — simplify `<Switch>` className; tighten nav `boxShadow`.
- `src/styles.css` — extend the existing `.dark { … }` block with semantic token overrides (no changes to `:root`).

## Not touched

- Any Supabase query, route, or `runs.$runId.tsx` polling.
- The locked light palette in `:root`.
- `src/components/ui/switch.tsx`.
