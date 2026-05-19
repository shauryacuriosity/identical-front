## Combined plan — Supabase scaffold + UI data wiring

Two phases in one pass. Phase A creates the integration files (no UI change). Phase B replaces mock data with real queries (structure + data only, no styling, tokens, layout, or component shapes touched).

---

## Phase A — Manual Supabase scaffold

### A0. Secrets (blocker — needs your input)

No Supabase secrets exist in the project yet. After you approve this plan I will call `add_secret` to request:

- `VITE_SUPABASE_URL` — project URL, e.g. `https://xxxx.supabase.co` (safe in client bundle)
- `VITE_SUPABASE_ANON_KEY` — publishable/anon key (safe in client bundle)

Both are `VITE_*` so the browser client can read them via `import.meta.env`. We are intentionally **not** storing the service-role key (no server-side admin path this pass, no auth middleware).

### A1. Install client

`bun add @supabase/supabase-js` (only dep needed).

### A2. New files

**`src/integrations/supabase/types.ts`** — hand-written `Database` type matching the six tables exactly as you posted. Shape:

```ts
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      datasets: { Row: {...}; Insert: {...}; Update: {...} };
      analysis_runs: { Row: {...}; Insert: {...}; Update: {...} };
      eda_results: { Row: {...}; Insert: {...}; Update: {...} };
      model_results: { Row: {...}; Insert: {...}; Update: {...} };
      cluster_results: { Row: {...}; Insert: {...}; Update: {...} };
      analysis_predictions: { Row: {...}; Insert: {...}; Update: {...} };
    };
  };
}
```

Every column from your DDL is included with correct nullability (e.g. `archived: boolean | null`, jsonb → `Json | null`, numeric → `number | null`, timestamptz → `string | null`). `Insert` makes server-defaulted columns optional (`id`, `uploaded_at`, `created_at`, `status`, `archived`).

**`src/integrations/supabase/client.ts`**:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

`persistSession: false` because there's no auth flow yet — avoids spurious localStorage writes during SSR.

**Skip**: `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`. Per your instruction.

### A3. Smoke test

A tiny `useQuery` on Home that does `supabase.from("datasets").select("id").limit(1)` — already implicit in Phase B's Recent Files query, so no separate ping needed. If credentials are wrong you'll see the error in the Recent Files row instead of a silent failure.

---

## Phase B — UI data wiring (no styling changes)

All edits are inside existing components. Tokens, classNames, spacing, shadows, ActionTile, AppHeader, AI Analysis step indicator, Recent Files row styling — **all untouched**. Only data sources and conditional render branches (loading skeleton / empty / error / "—") change.

### B1. Home — Recent Files table (`src/routes/index.tsx`)

- Remove the `RECENT` mock array.
- `useQuery(["datasets", "recent"], ...)`:
  ```ts
  supabase.from("datasets")
    .select("id,name,uploaded_at,row_count,mets_prevalence,archived,status")
    .eq("archived", false)
    .order("uploaded_at", { ascending: false })
    .limit(10)
  ```
- Map row → existing `Recent` shape. `type` is hard-coded `"Dataset"` for now (no analyses/visualisations table in scope). `modified` = relative time from `uploaded_at` via a small `formatRelative()` helper.
- Loading: 5 skeleton rows reusing the existing row container shell (same grid, same shadow, just `<Skeleton/>` placeholders inside cells). No new tokens.
- Empty (0 rows): single muted line "No datasets yet" inside the same container.
- Null `mets_prevalence` / `row_count` already renders as "—" per existing code path.

### B2. Datasets workspace (`src/routes/datasets.tsx`)

Need to view this file first to confirm the current selector/list shape, but plan: replace whatever mock list drives the dataset list with the same `datasets` query (without the `limit(10)`, still excluding archived). Selecting a dataset stores `dataset_id` in route search params or local state — depending on what the current UI does (I'll preserve whatever it does today, only swapping the data source).

### B3. AI Analysis — Step 4 Run (`src/routes/ai-analysis.tsx`)

- "Run" button → `useMutation` that inserts into `analysis_runs`:
  ```ts
  supabase.from("analysis_runs").insert({
    dataset_id,            // from step 1 selection
    name,                  // from step 2 input, or auto
    function_mode,         // from step 2 selection
    cohort_filter,         // jsonb from step 3
    method_config,         // jsonb from step 3
    status: "pending",
  }).select("id").single()
  ```
- On success: `router.navigate({ to: "/ai-analysis/results", search: { run_id } })` (current results route is `ai-analysis.results.tsx` — will confirm exact param convention when reading it).
- Button shows pending state during mutation; surface `error.message` inline below the button on failure. No new components.

### B4. Results dashboard (`src/routes/ai-analysis.results.tsx`)

Reads `run_id` from search params. Four parallel `useQuery` calls keyed on `run_id`:

1. **Run header** — `analysis_runs` row (status, progress, started/finished, error_message).
2. **EDA panel** — `eda_results` (n, mets_prevalence, mets_prevalence_by_sex, n_dietary_columns, figure_paths).
3. **Model metrics panel** — `model_results`; render **only** `logistic_metrics_test` and `xgboost_metrics_test` (`weighted_auc`, `precision`, `recall`, `f1`). `_train` fields are never displayed.
4. **SHAP panel** — `model_results.shap_top_features` (jsonb array of {feature, value}).
5. **Cluster scatter + cards** — `cluster_results.cluster_summaries` + `figure_paths`.
6. **Per-subject table** — `analysis_predictions` filtered by `run_id`, paginated 50/page. Uses Supabase `.range(from, to)` with a `count: "exact"` head query for total. Page state in local component state; no URL change. Existing table styling preserved.

Every field that is null renders `"—"`. Each panel shows a skeleton (existing skeleton component) while its query is loading. Errors render inline within the panel as `"Failed to load — {message}"` in `text-ink-2`, no toast, no new styling.

---

## Files

**New**
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

**Edited (data wiring only, zero style changes)**
- `src/routes/index.tsx` — replace `RECENT` mock with query
- `src/routes/datasets.tsx` — replace mock with query
- `src/routes/ai-analysis.tsx` — wire Run mutation
- `src/routes/ai-analysis.results.tsx` — wire all panels

**Dependency**
- `@supabase/supabase-js` (via `bun add`)

**Untouched**
- `src/styles.css` (no tokens added)
- `src/routes/__root.tsx` (AppHeader)
- `ActionTile`, `TypePill`, `StatusDot`, `RowAction`, welcome heading, all spacing/shadow/font tokens
- AI Analysis 4-step indicator visuals
- `src/routes/visualisation.tsx` (no data spec given for it this pass)

---

## What I need from you to proceed after approval

1. **Approve the plan.**
2. When `add_secret` prompts appear, paste:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Once both are stored I'll execute Phase A then Phase B in one pass and verify the Home query returns at least the smoke-test response.
