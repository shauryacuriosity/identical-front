## Scope
Two small visual tweaks to `src/routes/index.tsx`. No other files touched.

## Changes

### 1. Action tiles (New Dataset / New Visualisation / New AI Analysis)
In `ActionTile`:
- Remove the lift animation: drop `hover:-translate-y-0.5 transition-all duration-200` (keep a `transition-colors` for the background swap).
- Remove the coral top border strip (the `<span aria-hidden ...>` with the coral background).
- Add hover background using the existing highlight token: `hover:bg-surface-hover` (the same token used elsewhere for hover states).
- Keep the icon tile, label, and description untouched.

Net effect: tiles stay perfectly still on hover and simply tint to the highlight color.

### 2. Recent Projects row leading indicator
In the row render block:
- Replace the `StatusDot` (the small filled dot shown by default) with an always-visible empty `RowCheckbox` in the unchecked state.
- Keep current behavior: clicking the checkbox toggles selection; clicking the row still navigates.
- Remove the cross-fade between dot and checkbox — the checkbox is the single default state, and the checked state simply fills it (already handled by `RowCheckbox`).
- Skeleton row dot can also be swapped to a faint empty checkbox square for visual consistency (small detail).

The `StatusDot` component itself can stay defined or be removed since it becomes unused — I'll remove it to keep the file clean.

## Out of scope
- No changes to other routes, tokens, or the checkbox component itself.
- No layout/grid changes — column widths and spacing stay identical.
