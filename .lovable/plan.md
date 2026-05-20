## Changes to `src/routes/index.tsx`

**1. ActionTile hover behavior**
- Remove `hover:-translate-y-0.5 transition-all duration-200` from the tile's className.
- Replace with a hover background highlight using the existing `--surface-hover` token (e.g. `hover:bg-surface-hover transition-colors`).
- Keep the coral top accent bar as-is.

**2. Recent Projects row indicator**
- Replace the `StatusDot` shown in the row's default (non-hover, non-selected) state with an empty `RowCheckbox` (unchecked, `checked={false}`, no-op onChange that just calls `toggleOne(f.id)`).
- On hover/selection, the existing checkbox already appears — keep that behavior. Effectively the dot layer becomes a dimmed empty checkbox so the column always shows a checkbox.
- Remove the now-unused `StatusDot` component if no other call sites exist.

**3. "+" button next to Recent Projects heading**
- Add an icon button (lucide `Plus`, styled to match the attached coral-outlined circular plus) immediately to the right of the heading + count chip, before the spacer that pushes "View all" to the right.
- On click: create a new project via `createProject({ name: "", datasets: [] })` from `projects-store`, then `navigate({ to: "/datasets", search: { projectId: newId, focusName: true } })`.
- In `src/routes/datasets.tsx`: when the `focusName` search param is true, auto-focus the project name input on mount (existing inline rename UI), defaulting display to "Untitled project" placeholder while the field is empty. No datasets are preloaded since the new project has an empty `datasets` array — the existing "Please select a dataset" empty slot flow handles this.

**Scope guardrails**
- No changes to pipeline logic, projects-store schema, or AI Analysis page.
- Only `src/routes/index.tsx` and a small `focusName` handling addition in `src/routes/datasets.tsx`.
