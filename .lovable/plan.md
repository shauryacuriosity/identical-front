# Plan — prevalence fix + Step-1/4 wiring + /runs/$id dashboard

## A. Prevalence display fix (1 line per site)

`mets_prevalence` is stored as a 0–1 decimal. Multiply by 100 before formatting.

- `src/routes/index.tsx` — Recent Files row:
`f.prevalence != null ? \`${(f.prevalence * 100).toFixed(1)}% : &nbsp;`
- Same rule applied in the new Run summary card (eda_results.mets_prevalence).

No other display semantics change.

## B. Step-1 Map — real dataset selector

Replace the hardcoded "Dataset_A_dietary.csv" button in `ai-analysis.tsx` (around line 537–542) with a live dropdown driven by:

```ts
supabase.from("datasets")
  .select("id,name,row_count,status,archived")
  .eq("archived", false)
  .eq("status", "ready")
  .order("uploaded_at", { ascending: false })
```

- Option label: `name` + small muted  `· {row_count.toLocaleString()} rows` (or `—` if null).
- Component state: `selectedDatasetId: string | null` (default null).
- Visual: same `h-10 px-3 rounded-lg border …` button as today; menu uses the existing `ChevronDown` and styling pattern from the MappingRow dropdown — no new tokens, no new classes.
- Loading: shows current button with text "Loading datasets…". Empty: "No ready datasets". Error: inline `text-ink-3` line below.
- Persists across step transitions (lifted into `AiAnalysisPage`).

## C. Step-4 Run — real mutation

Add a `useMutation` driven by the live form state. On click of the existing primary Run button (no visual change):

```ts
const { data, error } = await supabase
  .from("analysis_runs")
  .insert({
    dataset_id: selectedDatasetId!,
    name: runName,
    function_mode: fnMode === "full" ? "full"
                 : fnMode === "predict" ? "prediction_only"
                 : fnMode === "discover" ? "subgroup_only"
                 : "labels_only",
    cohort_filter: {
      age_min: ageMin, age_max: ageMax,
      sex: sex.toLowerCase(),                 // "all" | "female" | "male"
      exclude_pregnant: excludePregnant,
      require_complete: requireComplete,
    },
    method_config: {
      prediction: showPredict && predictOn
        ? { model: predictModel }             // "xgb" | "logreg" | "both"
        : null,
      subgroup: showSubgroup && subgroupOn
        ? { algorithm: clusterAlg, k: 4, projection: dimRed }  // "pca" | "tsne"
        : null,
    },
    status: "pending",
  })
  .select("id")
  .single();
```

On success: `navigate({ to: "/runs/$runId", params: { runId: data.id } })`.
Disable Run button when `!selectedDatasetId`. Mutation error shown inline under the button via `text-ink-3` (no toast).
The existing local "fake progress" simulator is removed so the button does real work; the step-indicator "running" state is wired to `mutation.isPending` until navigation completes.

## D. New route `src/routes/runs.$runId.tsx`

Pattern: `/runs/:id`. This replaces the static `/ai-analysis/results` mock for the live flow (the old route is left in place — not deleted, just unused; safe to remove later).

### Polling

```ts
useQuery({
  queryKey: ["analysis_runs", runId],
  queryFn: () => supabase.from("analysis_runs")
    .select("id,status,progress,error_message,started_at,finished_at,name,dataset_id")
    .eq("id", runId).single(),
  refetchInterval: (q) => {
    const s = q.state.data?.data?.status;
    return s === "complete" || s === "failed" ? false : 2000;
  },
})
```

### While `status !== "complete"`

Renders a centered card: run name, current status pill, progress bar (`progress ?? 0`), `error_message` if `status === "failed"`. Same surface/hairline tokens — no new styling.

### When `status === "complete"`, fire four parallel queries

All keyed on `["…", runId]`, all `enabled: status === "complete"`:

1. `eda_results` — `select("n,mets_prevalence,mets_prevalence_by_sex,n_dietary_columns,figure_paths").eq("run_id", runId).maybeSingle()`
2. `model_results` — `select("xgboost_metrics_test,shap_top_features,figure_paths").eq("run_id", runId).maybeSingle()` (note: `_train` fields never selected, never displayed)
3. `cluster_results` — `select("cluster_summaries,figure_paths").eq("run_id", runId).maybeSingle()`
4. `analysis_predictions` (paginated) — `select("subject_id,predicted_prob,predicted_label,actual_label,cluster_label", { count: "exact" }).eq("run_id", runId).order("subject_id").range(from, to)`. Page in local state (default 0, page size 50).

### Panels (reuse the look of `ai-analysis.results.tsx`)

- **Run summary card** — `Cohort: eda_results.n` rows; `(eda_results.mets_prevalence * 100).toFixed(1)%` MetS prevalence; sex breakdown from `mets_prevalence_by_sex` jsonb if present. Right column: `xgboost_metrics_test.weighted_auc / precision / recall / f1` — each as `.toFixed(2)`. Any missing field → `—`.
- **SHAP panel** — bar list from `shap_top_features` jsonb. Expects shape like `[{feature, value, unit?}]` — render whatever shape comes back; fall back to `JSON.stringify` of the entry if it's not an array of objects with `feature`+`value` (defensive, since shape isn't pinned in the schema).
- **Cluster scatter + cards** — `cluster_summaries` jsonb drives the cards (id, label, n, mets prevalence × 100, center if present). Scatter uses `figure_paths` if it points to an image URL; otherwise omitted with `—`.
- **Per-subject table** — columns: `subject_id`, `predicted_prob` (× 100, 1 dp, %), `predicted_label`/`actual_label` (✓ / – / —), `cluster_label`. Footer: `Showing {from+1}–{min(to+1,count)} of {count}` + Prev / Next buttons. Same table styling as the existing results page.

Every null cell → `<Em>` (the muted dash). Each panel independently shows a skeleton (`animate-pulse` placeholder block matching its container's geometry) while loading and an inline `text-ink-3` "Failed to load — {message}" on error.

### Errors / not-found

- `errorComponent` and `notFoundComponent` on the route, matching the existing root style.
- If the initial run query returns no row, render notFound.

## E. Files

**New**

- `src/routes/runs.$runId.tsx`

**Edited (data + small fixes only — no token/layout/component-shape changes)**

- `src/routes/index.tsx` — `× 100` in prevalence formatter
- `src/routes/ai-analysis.tsx` — dataset selector wired in Step 1; Run mutation + navigate in Step 4; remove fake-progress loop; disable Run when no dataset

**Untouched**

- All design tokens, AppHeader, ActionTile, TypePill, StatusDot, RowAction, AI-Analysis step indicator visuals, MappingRow, StepShell, datasets.tsx, visualisation.tsx, ai-analysis.results.tsx (the mock results page stays as-is for now; the live flow goes to `/runs/$runId`)

## F. Assumptions you should sanity-check before I apply

1. `function_mode` enum values: I'll write `full | prediction_only | subgroup_only | labels_only`. If your backend expects different strings, say so.
2. `analysis_runs.name` accepts the run name text from Step 1 (defaulted to "Untitled run").
3. The route shape `/runs/:id` is acceptable — alternative would be `/ai-analysis/results?run_id=…` if you want to keep the existing URL convention. Speak up if you prefer the latter; otherwise `/runs/$runId` it is.
4. SHAP and cluster_summaries jsonb shapes aren't pinned in the schema you posted. I'll render defensively (best-guess shape with `JSON.stringify` fallback). If you have the producer schema, paste it and I'll render exactly.

Approve and I'll apply A → B → C → D in one pass.

&nbsp;

&nbsp;

&nbsp;

> Approve. Answers to your sanity checks:
>
> **1. function_mode enum:** approved as written — `full | prediction_only | subgroup_only | labels_only`. These are canonical, the backend will conform to these strings.
>
> **2. analysis_[runs.name](http://runs.name) default:** "Untitled run" is fine. User can rename later.
>
> **3. Route shape:** go with `/runs/$runId`. Cleaner, RESTful, and runs are first-class objects worth bookmarking/sharing — leave `/ai-analysis/results` mock untouched as you proposed.
>
> **4. JSONB shapes — pin these, no defensive stringify fallback needed:**
>
> `shap_top_features` is a flat dict, feature → SHAP importance value (raw, not %):
>
> json
>
> ```json
> {
>   "DR1IFIBE": 0.234,
>   "DR1IKCAL": 0.187,
>   "age": 0.156,
>   ...
> }
> ```
>
> Render as horizontal bars: feature name on left, value scaled to widest bar. Sort descending by value. Top 10.
>
> `cluster_summaries` is an array of cluster objects:
>
> json
>
> ```json
> [
>   {
>     "cluster_id": 0,
>     "label": "High fibre, low sugar",
>     "n": 412,
>     "mets_prevalence": 0.18,
>     "top_features": [
>       {"feature": "DR1IFIBE", "mean": 28.4},
>       {"feature": "DR1ISUGR", "mean": 42.1}
>     ]
>   },
>   ...
> ]
> ```
>
> Render as cards: `label` (or `Cluster {cluster_id}` if label is null) as header, `n` rows + `mets_prevalence × 100` % as stats, `top_features` as a small list. `mets_prevalence` follows the same × 100 rule as elsewhere.
>
> Apply A → B → C → D.

&nbsp;