
## What's changing

Two tightly-related polish passes on `src/routes/index.tsx`. No new files, no routes, no styling tokens. Same eAsia palette and typography.

## File scope

- **Edit only** `src/routes/index.tsx`.
- Replace the `recent` mock array, the `ActionCard` component, and the table markup.
- Greeting `h1` font-size 34 → 28.

## Why the hierarchy shift matters

Today the home page reads top-to-bottom as "three giant launch buttons, then a list" — the visual language of a consumer app like Notion or Linear's empty-state. That's the wrong signal for a research workbench. Public-health researchers don't open the app to *create*; they open it to *resume* — they have an analysis half-done, a dataset that finished ingesting overnight, a colleague's run they need to inspect. Putting "Recent files" as the page hero with rich, scannable metadata (type, rows, MetS prevalence, modified) tells the user "this is a workspace where work lives," not "this is a launcher." It's the same shift that distinguishes a Jupyter project browser or RStudio's file pane from a consumer dashboard. The action cards still exist — researchers do start new work — but they shrink to a toolbar that sits above the workspace, the way "New File / New Folder" sits above the file list in a code editor, not the way "Create Doc / Create Sheet" dominates Google Drive.

The greeting drops from 34 → 28 for the same reason: the page's heaviest element should be the workspace contents, not the welcome line. A smaller greeting also reads as more professional — research tools don't shout.

## Compact action toolbar

```text
┌────────────────────────────┬────────────────────────────┬────────────────────────────┐
│  ▢  New Dataset            │  ◇  New Visualisation      │  ⬚  New Analysis           │
└────────────────────────────┴────────────────────────────┴────────────────────────────┘
```

- ~80px row, three equal-width tiles in a grid (responsive: stack on mobile).
- Each tile: 36×36 coral-tint icon square on the left, title in Inter Tight semibold, no description by default. On hover, a one-line description fades in to the right of the title (kept on a single line; truncates if needed). This satisfies "description shown on hover" without changing tile height.
- Hairline border, no shadow, subtle hover (translate-y-px, coral-tinted border).
- Copy updates:
  - "New Dataset" — "Import a CSV or connect a source"
  - "New Visualisation" — "Chart distributions and correlations"
  - **"New Analysis"** (dropped "AI") — **"Run MetS prediction, SHAP rankings, and subgroup clustering"**

## Recent files — the new hero

Greeting + toolbar collapse into ~180px of header chrome; everything below is the table.

Header row: section title `Recent files` (Fraunces 20px), small `View all` link right-aligned.

Table columns (left→right):

| col | header | content |
|---|---|---|
| 1 | (status dot) | coral dot for active, faded for archived |
| 2 | NAME | `FileText` icon + monospace filename |
| 3 | TYPE | pill — Dataset (coral), Analysis (sage), Visualisation (ochre); archived = muted grey regardless of type |
| 4 | ROWS | monospace tabular, right-aligned |
| 5 | METS PREVALENCE | monospace `23.4%` or `—` |
| 6 | MODIFIED | text-ink-2, right-aligned |
| 7 | (actions) | on row hover, surface `Open · Duplicate · Archive` icon buttons that slide in from the right edge; non-interactive (no handlers wired) |

Row height 64px. Hairline dividers between rows. Subtle `surface-hover` on row hover. Cursor pointer.

### Type pill colours

Built from existing tokens — no new colours:

- **Dataset** — `--coral-tint` bg, `--coral` text
- **Analysis** — `--data-sage` at ~15% bg, sage at ~60% darkened text
- **Visualisation** — `--data-ochre` at ~18% bg, ochre at ~55% darkened text
- **Archived** — `--surface-hover` bg, `--ink-3` text (replaces the type colour entirely so archived rows read as one visually quiet group regardless of what they originally were)

Same `color-mix` pattern already used by the confidence pills on the Analysis screen for consistency.

### Sample data wired in

The 7 rows from your spec, typed:

```text
Dataset_A_dietary.csv     Dataset       2,431  23.4%  2h ago
nhanes_bp_2023.csv        Dataset       2,060  —      yesterday
MetS_risk_run_2025-05     Analysis      1,847  23.4%  yesterday
Fibre intake distribution Visualisation 2,431  —      yesterday
cohort_baseline.csv       Dataset       2,873  19.1%  3 days ago
lab_results_q3.csv        Dataset       3,686  —      last week   (archived)
demographics.csv          Dataset       4,499  —      May 2       (archived)
```

## Hover action icons (right-edge slide-in)

Three icon-only buttons (`SquareArrowOutUpRight`, `Copy`, `Archive` from lucide), 28×28, ghost style (transparent, hover = `surface-hover` + coral icon). Hidden by default (`opacity-0`), revealed via group-hover (`group-hover:opacity-100`) with a 150ms transition. They sit absolutely-positioned over the rightmost column so they don't disturb layout when hidden. Stop propagation on click so they don't trigger a row "open" (when that gets wired later).

## Out of scope

- Wiring action icons to real handlers (open / duplicate / archive).
- Filtering / sorting the table.
- Real data — still hard-coded mock rows.
- A "View all" page.
- Empty-state design for a fresh workspace.

Approve and I'll ship it in one edit.
