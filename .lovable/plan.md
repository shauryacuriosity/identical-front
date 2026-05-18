# Add "Pipeline" sentence header to Datasets

## Heads-up — state mismatch to resolve first

Your brief assumes the four dropdowns (JOIN BY / AGGREGATE BY / SORT BY / FILTER BY) still exist on the Datasets screen. They don't — an earlier pass replaced them with the chip-based `PipelineStrip` (the `from → join → aggregate` chips you see now). So a literal reading of this brief ("add a header above the dropdowns, don't change the dropdowns") can't be executed as written.

Two ways forward — I need you to pick:

**Option A — Restore the 4 dropdowns, then layer the sentence header on top (literal brief).**
Bring back the JOIN BY / AGGREGATE BY / SORT BY / FILTER BY dropdown row exactly as Adrian designed it, and add the sentence-of-chips header above it. Two coexisting representations of the same state: dropdowns drive it, sentence visualises it, clicking a chip scrolls to its dropdown. This matches your words exactly but means undoing the previous pass's interaction model.

**Option B — Keep the current chip pipeline, add a plain-English sentence header above it (spirit of the brief).**
The current `PipelineStrip` already replaces the dropdowns with a more direct equivalent. We add the "PIPELINE" caption + sentence row above it as a read-only narrative summary — same empty / partial / full states, same monospace dataset and column names, same coral arrows, clicking a chip scrolls to and pulses its corresponding pipeline chip below. The sentence layer complements the chip strip the same way it would complement dropdowns.

My recommendation: **B**. The chip strip is closer to what your brief is reaching for than the dropdowns were, and stacking a sentence summary above it gives you the "real-time, plain-English view" without re-introducing the disconnected-fields problem the previous pass solved. But if Adrian's dropdowns are non-negotiable for the demo, A is the right call and I'll restore them faithfully.

## What ships either way

- Section caption `PIPELINE` in the same small-uppercase-caption style as the existing step labels (`10.5px`, tracking `0.1em`, `text-ink-3`, semibold).
- One-line sentence built from chips, wraps on narrow widths.
- Empty state: muted `"Configure the controls below to see your transformation summarised here."`
- Partial: `[Dataset_A.csv] + [Dataset_B.csv] joined by [SEQN] (Inner)`
- Full: `[Dataset_A.csv] + [Dataset_B.csv] joined by [SEQN] (Inner) → aggregated [level_sugar] by [Mean] → sorted [Ascending] → filtered where [age > 40]`
- Chip styling: hairline border, hover surface-tint, monospace for dataset and column names, regular Inter (slightly muted, `text-ink-2`) for operators "joined by / aggregated by / sorted / filtered where", coral `→` connectors.
- Click chip → smooth-scroll to target row + 300ms outline pulse (coral ring, fades out).
- No inline editing on chips. v1 scroll-and-highlight only.

## File scope

- **Edit only** `src/routes/datasets.tsx`.
- Add a new `PipelineSentence` component above whichever control surface we settle on.
- Each chip carries a `targetId`; the target row gets a matching `id` + a `ringPulse` state toggled on click.
- Result-count + last-saved footer untouched.

## Out of scope

- Inline editing from chips.
- Reordering, removing, or merging the four operations.
- Any change to the sticky footer, sidebar, or dataset bars.

Tell me **A** or **B** and I'll ship it in one edit.
