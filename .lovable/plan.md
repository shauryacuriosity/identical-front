
## What's changing & why

Right now `/ai-analysis` is a generic chat prompt — wrong product. The real eAsia workflow is a structured, supervised pipeline a public-health researcher walks through once per analysis run. This plan replaces that screen with the four-step Map → Cohort → Method → Run flow on a single page, reusing the existing warm-cream / coral / Fraunces / Inter / JetBrains Mono tokens already in `src/styles.css`. No new colors. No backend. Visual shell + local state only.

## File scope

- **Rewrite** `src/routes/ai-analysis.tsx` — the entire workflow.
- **New** `src/components/analysis/StepIndicator.tsx` — sticky 4-step rail.
- **New** `src/components/analysis/MappingRow.tsx` — single field row with confidence pill.
- **New** `src/components/analysis/ConfidencePill.tsx` — the sage/amber/coral pill (see UX note).
- **New** `src/components/analysis/CohortPreview.tsx` — live cohort stats card.
- **New** `src/components/analysis/MethodCard.tsx` — selectable Association / Subgroup card.
- **New** `src/components/analysis/RunProgress.tsx` — Step 4 progress list (simulated timers).
- No changes to Home, Datasets, Visualisation, `__root.tsx`, or `styles.css`.

## Page structure

```text
┌─────────────────────────────────────────────────────────┐
│ Breadcrumb: Analysis · [Untitled run]   (editable)      │
│ ────────────────────────────────────────────────────    │
│ ● Map ──── ○ Cohort ──── ○ Method ──── ○ Run   (sticky) │
├─────────────────────────────────────────────────────────┤
│ STEP 1 — expanded                                       │
│   Dataset_A_dietary.csv ▾                               │
│                                                         │
│   MetS Clinical Criteria                                │
│     Waist circumference   →  waist_circ   [auto·0.94]   │
│     Triglycerides         →  trig_mg_dl   [auto·0.89]   │
│     ...                                                 │
│                                                         │
│   Demographics & Dietary Features                       │
│     Age                   →  age_years    [auto·0.98]   │
│     Dietary fibre         →  fibre_g      [review·0.71] │
│     ...                                                 │
│     + Add field                                         │
│                                                         │
│   ⓘ MetS labels are computed using NCEP ATP III...      │
│                                            [Continue →] │
├─────────────────────────────────────────────────────────┤
│ STEP 2 — collapsed until step 1 confirmed               │
│ STEP 3 — collapsed                                       │
│ STEP 4 — appears on Run                                  │
└─────────────────────────────────────────────────────────┘
```

Steps collapse to a single-line summary when complete (e.g. "Cohort · 1,847 of 2,431 rows · age 20–65 · all sexes · pregnant excluded"). Click to re-edit, which marks downstream steps stale.

## Confidence pill — the UX choice your supervisor will look at

The pill is doing two jobs at once: showing the AI suggestion *and* the level of human attention required. So color encodes **action**, not just score:

| Score | Color | Label | Why |
|---|---|---|---|
| ≥0.85 | sage (`--data-sage` at ~15% tint) | `auto · 0.94` | Safe to accept — scanning, not deciding |
| 0.65–0.84 | ochre (`--data-ochre` ~18%) | `review · 0.72` | Should glance — not alarming |
| <0.65 | coral (`--coral-tint`) | `needs review · 0.48` | Pulls the eye — same family as primary CTA |
| unmapped | dashed `--hairline` | `select column` | Clearly empty, not styled like a value |

All inline, never modal — clicking the column-name chip opens a small inline dropdown of the dataset's columns; the pill recomputes (re-mapped manually = neutral grey "manual"). This keeps the researcher in flow and makes the "human reviewed AI" story visible at a glance.

## The lab-values-label-only annotation

After Step 1's mapping list, a quiet `--surface-hover` info card with a small `info` icon:

> MetS labels are computed using NCEP ATP III criteria from the clinical fields above. The model predicts MetS from diet and demographics only — lab values are used to *label*, not to *predict*. This is the eAsia framing.

This is annotation chrome, not interactive — same typographic weight as body, italicised "label" / "predict" to mirror the methodological distinction. It sits at the bottom of Step 1 so it's read after the researcher sees both groups (clinical vs dietary), which is when the distinction makes sense. We're not hiding it behind a tooltip because it's the core scientific claim of the product.

## Step details

**Step 1 — Map.** Two grouped sections (Clinical Criteria, Demographics & Dietary). Hard-coded suggestion rows from the spec. Each row: target label (Inter semibold) · `→` · column chip (JetBrains Mono) · confidence pill (right-aligned). "+ Add field" ghost row at the bottom of group B. Annotation card. `Continue to Cohort` coral button, right-aligned.

**Step 2 — Cohort.** Two-column layout: controls on the left (dual-handle Radix slider for age, chip group for sex, two toggle rows), CohortPreview card on the right with row count, MetS prevalence, stacked sage/coral bar, mean age + sex split. Numbers update via a small deterministic mock formula from filter inputs (no backend). `Continue to Method`.

**Step 3 — Method.** Two MethodCards side-by-side, both checkable independently, both default on. Selection state = coral hairline + faint coral-tint surface. Subgroup card reveals a small `k` numeric stepper (2–8) when active. `Run analysis` button, larger, coral filled.

**Step 4 — Run.** Status list with five rows, each starting as pending dot → spinner → check. Simulated via `setTimeout` chain (rough 600–1200ms each). Sticky indicator updates: first three checks, last one as "Running…". When all done: plain-language line + `Run complete · View Results →` button (links nowhere yet — wired in next prompt).

## State

Single `useState` per step, plus a `currentStep` cursor. No global store, no Cloud, no server fns — visual shell only. All mock data lives at the top of the file as typed constants so it's trivial to wire to real data later.

## Out of scope

- Results screen (next prompt).
- Real column parsing from a CSV.
- Wiring the dataset dropdown to the Datasets screen.
- Saving / loading runs.
- Backend, ML, SHAP, K-Means — only the visual progress simulation.

Approve and I'll build it in one pass.
