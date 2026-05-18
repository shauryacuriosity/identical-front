# AI Analysis: input-adaptivity + richer Method step

Two refinements applied to `src/routes/ai-analysis.tsx` (and a small touch to `src/routes/ai-analysis.results.tsx` only if Method summary copy changes). All styling from the previous pass — coral, Montserrat, hairlines, shadows, radii — is preserved verbatim. The 4-step indicator (Map → Cohort → Method → Run) stays.

---

## 1. Addressing Zhuojin's input-adaptivity concern

> "The system should ask for what you need based on what you're running — not require all inputs upfront when the function doesn't need them."

**What's added.** A subtle, single-line chip group at the very top of Step 1, above the dataset selector:

```text
WHAT ARE YOU RUNNING?
( Full analysis )  ( Prediction only )  ( Subgroup discovery only )  ( Generate labels only )
```

- Caption uses the existing `text-[12px] uppercase tracking-[0.12em] text-ink-3` style — identical to existing section labels.
- Chips reuse the existing pill style (h-7, rounded-full, hairline border, `bg-surface-hover` on selected, `border-coral/40 text-coral`), single-select, default `Full analysis`.
- State lives in a single `fnMode` variable (`"full" | "predict" | "discover" | "labels"`) that drives the rest of the workflow.

**How inputs adapt** (driven by `fnMode`, no structural rework):

| Mode | MetS Clinical Criteria | Demographics & Dietary | Step 3 — Method | Run output |
|---|---|---|---|---|
| Full analysis *(default)* | required | required | both sections, both enabled | current behavior |
| Prediction only | "MetS label (if already in data)" select column row appears at top. If mapped → the 5 criteria rows render with `optional · used for verification` muted tag. If unmapped → criteria stay required (system computes label). | required | Prediction section only | predictions + SHAP |
| Subgroup discovery only | section header gets `optional` tag, rows greyed but available | required | Subgroup section only | clusters + PCA |
| Generate labels only | required | **section hidden entirely** | **Step skipped** — Continue on Step 2 jumps to Step 4; Method step renders faded with an `n/a` tag in the indicator | labelled dataset |

**Default behavior is preserved.** A researcher who never touches the chip group sees the canonical pipeline they have today — same fields, same Method defaults, same Run output. The selector is additive opt-in for narrower runs.

**Step indicator behavior.** When `fnMode === "labels"`, the Method dot renders with `opacity-50`, a small `n/a` caption replaces the number, and the connector to Run is dashed. The Continue handler on Step 2 in this mode calls `advanceFrom("cohort", "run")` and adds `"method"` to a `skipped` set so `StepIndicator` styles it accordingly.

---

## 2. Addressing Adrian's "more models" concern

> "The Method step is too simple — our backend supports more models and configurations than the UI surfaces."

Step 3 is redesigned from two flat cards into two **independently-toggleable sections** (`A — Prediction`, `B — Subgroup Discovery`) that mirror the backend capability surface. Both checked by default in Full analysis mode; visibility is filtered by `fnMode` per the table above.

### Section A — Prediction (supervised)
Card with header checkbox + label `Prediction · what predicts MetS in this cohort?`. When checked, expands to:

- **Model** (label) — single-select radio group:
  - **XGBoost** *(recommended — handles non-linearities and missing data well)*
  - **Logistic Regression** *(more interpretable, smaller sample sizes)*
  - **Compare both** *(runs both side-by-side, comparative metrics)*
- **Advanced** collapsible (closed by default, chevron + `text-ink-3` caption):
  - For XGBoost: `max_depth` slider (2–8, default 5), `n_estimators` slider (100–1000, default 300)
  - For Logistic Regression: regularization strength slider, L1/L2 segmented toggle
  - For Compare both: shows both groups stacked
- Output preview *(italic, `text-[12.5px] text-ink-3`)*:
  > "Produces test-set AUC + sensitivity + specificity, SHAP feature ranking, per-subject predictions."

### Section B — Subgroup Discovery (unsupervised)
Card with header checkbox + label `Subgroup Discovery · what sub-populations exist?`. When checked, expands to:

- **Clustering algorithm** — radio group:
  - **K-Means** *(recommended)*
  - **Hierarchical clustering** — *coming soon* (greyed card, disabled)
  - **DBSCAN** — *coming soon* (greyed card, disabled)
- **Number of clusters (k)** — stepper 2–8 (default 4) with a toggle `Auto-select via silhouette score` (when on, stepper disables)
- **Dimensionality reduction for visualisation** — radio group:
  - **PCA** *(recommended)*
  - **t-SNE** — *coming soon* (greyed)
  - **UMAP** — *coming soon* (greyed)
- Output preview *(italic, muted)*:
  > "Produces cluster profiles, PCA scatter, per-cluster MetS prevalence."

### "Coming soon" cards
Rendered with `opacity-50`, `cursor-not-allowed`, a small `soon` chip in the corner, and no radio interaction. They communicate what backend v2 will support without lying about today's state. Wiring happens at backend integration.

### Run Analysis CTA
Step 4 footer button gets bumped: larger (`h-11 px-6`), coral filled, primary CTA — `Run Analysis`. Unchanged otherwise.

### Models/algorithms now surfaced
- Live today: **XGBoost**, **Logistic Regression**, **K-Means**, **PCA**
- v2 placeholders: **Hierarchical clustering**, **DBSCAN**, **t-SNE**, **UMAP**

---

## 3. What stayed unchanged

- **Step indicator** at the top — same 4 steps, same sticky placement, same coral/hairline tokens. The only addition is the `n/a` faded state for Method when `fnMode === "labels"`.
- **Styling pass** — `--canvas`, `--coral`, `--surface`, hairlines, Montserrat + JetBrains Mono, shadow tokens, radii — untouched. No new design tokens introduced.
- **StepShell** component, completion summaries, "reopen" behavior, breadcrumb + editable run name, Cohort step (Step 2) in its entirety, Run step's progress list, and the results route.
- **Default flow** — Full analysis + both methods enabled + XGBoost + K-Means(k=4) + PCA reproduces today's run-summary copy: `Association · Subgroup Discovery (k=4)` becomes `XGBoost · K-Means (k=4, PCA)`, fed into the existing `methodSummary` string.

---

## Technical notes

- New state in `AiAnalysisPage`:
  - `fnMode: "full" | "predict" | "discover" | "labels"` (default `"full"`)
  - `mlsLabelCol: string | null` (used only when `fnMode === "predict"`)
  - `predictModel: "xgb" | "logreg" | "both"` (default `"xgb"`), `xgbDepth`, `xgbTrees`, `lrReg`, `lrPenalty`
  - `clusterAlg: "kmeans"`, `kAuto: boolean`, `dimRed: "pca"`
  - `skipped: Set<StepKey>` (only ever holds `"method"` when `fnMode === "labels"`)
- `StepIndicator` extended with an optional `skipped` prop; renders `n/a` and reduced opacity for keys in the set.
- `advanceFrom` on Step 2 branches: `fnMode === "labels"` → jump to `"run"` and mark method skipped + complete.
- Chip group, section checkboxes, sliders, steppers, and "coming soon" cards all built from existing Tailwind utilities — no new shadcn components needed.
- Scope: edits confined to `src/routes/ai-analysis.tsx`. No backend, no schema, no route changes.
