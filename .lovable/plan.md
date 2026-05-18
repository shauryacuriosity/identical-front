
## What's being built

A new `/ai-analysis/results` route (linked from Step 4's "View Results →" button) showing the deliverable of one MetS run. Same warm-cream / coral / Fraunces / Inter / JetBrains Mono tokens — no new colors, no backend. Recharts for the two plots.

## File scope

- **New** `src/routes/ai-analysis.results.tsx` — the dashboard.
- **Edit** `src/routes/ai-analysis.tsx` — wire the "View Results →" button to navigate here.
- Reuse the existing `--data-sage / --data-ochre / --data-slate / --coral` tokens already in `styles.css` for the four cluster colours — these are perceptually spaced (different hue families: red, green, blue, yellow-brown), which is the strongest defence against colour-vision deficiencies.

That's it — no new shared components, no `styles.css` change, no Cloud.

## The four-panel composition

```text
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb · run name                  [New] [Export Report] │
├──────────────────────────────────────────────────────────────┤
│ PANEL 1 — Run summary (full width)                           │
│  Cohort   │   Model performance   │   ROC sparkline          │
├──────────────────────────────┬───────────────────────────────┤
│ PANEL 2 — SHAP bars  (55%)   │ PANEL 3 — Cluster scatter +   │
│                              │   2×2 summary grid    (45%)   │
├──────────────────────────────┴───────────────────────────────┤
│ PANEL 4 — Per-subject predictions table (full width)         │
├──────────────────────────────────────────────────────────────┤
│ Run manifest (muted mono caption)                            │
└──────────────────────────────────────────────────────────────┘
```

### Why this layout

The reading order mirrors how an epidemiologist defends a finding in a paper:
**"what we ran" → "did it work" → "what mattered" → "are there subgroups" → "the receipts."** Panel 1 establishes legitimacy (cohort + honest test-set performance) before any conclusion is shown. Panels 2 and 3 are the *finding* — they sit side-by-side because they answer two different but complementary questions about the same model run, and a researcher wants to read across them ("sodium is the top predictor — does it dominate a specific cluster?"). Panel 4 is intentionally last and visually quieter: per-subject predictions are evidence the model is real, not the headline insight.

### Why Panels 2 and 3 are paired side-by-side, not stacked

The scatter and the bar chart are doing different jobs at the same level of abstraction: SHAP says *which variables* drive the model globally; clustering says *which groups of people* sit at different points in dietary space. Stacking them would imply a hierarchy — they're peers. Putting them side-by-side at 55/45 gives SHAP slightly more visual weight (it's the primary causal-feeling story) while keeping the scatter at a size where 4 clusters are clearly separated.

### The scatter ↔ cluster-summary-cards relationship

The PCA scatter and the 2×2 grid of cluster cards beneath it are the **same data, two encodings** — the scatter shows *separation* (are the groups actually distinct?), the cards show *meaning* (what does each group represent clinically?). The coloured dot on each card matches the cluster colour in the scatter exactly, so the eye binds them without a legend. The four labels — "Low-fibre, high-sodium" / "Balanced traditional" / "High-energy refined-carb" / "Mediterranean-style" — are the human-readable translation of the cluster centroid. MetS prevalence on each card lets the researcher immediately rank-order clusters by risk and verify the clusters are clinically meaningful, not just statistical artefacts. Cards are hoverable (lift + coral hairline) so they read as "drillable" even though the drill-in isn't wired this prompt.

### Why test-set metrics, honestly

This is the methodological backbone of the screen and the bit a peer-reviewer or supervisor will scrutinise hardest. Training-set metrics inflate — a model can memorise its training data and still be useless on a new cohort. Showing **AUC 0.76 / Sensitivity 0.71 / Specificity 0.74 on n=480** (a held-out 20% split) signals three things at once: (1) we evaluated on data the model never saw, (2) we report multiple metrics so a single number can't hide class-imbalance failure modes, (3) we expose `n` so the reader can judge how much to trust the confidence intervals. A small italic caption ("honest test-set metrics") makes the methodological choice explicit rather than buried. For a marketing video this single phrase is the difference between "demo dashboard" and "research tool" — it's the one thing actual epidemiologists will pause and read.

## Panel implementation details

**Panel 1 — Run summary.** Single card, 3-column CSS grid. Big numbers in Fraunces + tabular. ROC sparkline is a Recharts `<LineChart>` of ~12 hand-tuned `(fpr, tpr)` points with a coral `<Area>` fill underneath and a dashed grey 45° reference line. No axes labels — it's a sparkline. Caption beneath.

**Panel 2 — SHAP.** Recharts `<BarChart layout="vertical">` with the 10 features from the spec, hard-coded in a typed array. Coral bars, hairline `<CartesianGrid>` horizontal only. Y-axis labels = feature name + unit (unit in mono via a custom tick renderer). Value labels at end of each bar in mono. Italic note about fibre below.

**Panel 3 — Clusters.** Recharts `<ScatterChart>` with 4 `<Scatter>` series, each a different `--data-*` colour. ~80 jittered points per cluster generated deterministically (seeded `Math.random()` replacement using index) so the layout is stable across reloads but doesn't ship a real CSV. Centroids as larger ring markers (same colour, stroke only, no fill). Axes labelled "PC1 (28% var)" / "PC2 (19% var)" in mono. Below: 2×2 grid of cards, each with a 10×10px coloured dot, label, `n =` and MetS prevalence in mono.

**Panel 4 — Predictions table.** Plain `<table>` (not shadcn — lighter), 8 hard-coded rows. `predicted_risk` cell renders the number in mono next to a 60px thin coral bar (`<div>` with width = risk × 100%). `mets_flag` is a small pill (coral-tint or sage-tint). `cluster` is a coloured dot + mono number. `key_features` are three subtle chips (`bg-surface-hover`, `border-hairline`, mono text) with `↑` / `↓` arrows. Pagination caption beneath, non-interactive.

**Run manifest.** Single line at the bottom, `text-[11px] text-ink-3 mono`, separators with `·`. Reads like a footer, not a panel.

## Header behaviour

Breadcrumb shows `Analysis · {editable run name} · {dataset}`. Run name editable on click (same pattern as the existing AI Analysis screen). Right side: `New Analysis` ghost button (navigates back to `/ai-analysis`, resets state), `Export Report` coral filled button (`console.log("export", { runId, ... })` — no PDF yet).

## Out of scope

- Real PDF export.
- Drill-into-cluster / drill-into-subject (cards and rows hover but don't navigate).
- Real model artefacts — all numbers from the spec are hard-coded as typed constants at the top of the file.
- Saved-runs list.
- Storing the run server-side.

Approve and I'll build it in one pass.
