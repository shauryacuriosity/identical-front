# Wire-up Readiness Plan

Goal: get the frontend into a state where your backend team only edits **one folder** (`src/lib/api/`) to connect real endpoints. No UI changes, no behaviour changes today — only an integration seam so swapping mock → real is a config flip, not a refactor.

## Current state (audit)

Two regimes coexist in the codebase today:

1. **Already backend-wired (Supabase client + React Query):**
   - `src/routes/ai-analysis.tsx` — reads `datasets`, inserts into `analysis_runs`.
   - `src/routes/runs.$runId.tsx` — polls `analysis_runs` + reads `eda_results`, `model_results`, `cluster_results`, `analysis_predictions`.
   - `src/routes/ai-analysis.results.tsx` — same tables.
   - Types in `src/integrations/supabase/db-types.ts`.

2. **Pure in-memory / client-side (no backend at all):**
   - `src/lib/projects-store.ts` — projects list, pipeline steps, selected attrs, saved charts (module-level `let projects`, `useSyncExternalStore`).
   - `src/lib/dataset-tables.ts` — uploaded dataset rows kept in a JS Map.
   - `src/lib/pipeline-exec.ts` — pipeline runs entirely in the browser.
   - `src/routes/datasets.tsx` — hardcoded `datasetA` / `datasetB` schemas, client-side CSV/XLSX parse via `parseDatasetFile`, mock seed rows.
   - `src/routes/visualisation.tsx` — pulls from the in-memory stores above.
   - `src/routes/index.tsx` — Recent Projects list from `useProjects()`.

The first regime is roughly fine; the second is the blocker for "connect everything."

## What I will change

### 1. New folder `src/lib/api/` — the only seam your backend touches

```text
src/lib/api/
├── index.ts          // re-exports + USE_MOCK flag
├── client.ts         // fetch wrapper: baseURL, JSON, auth header hook, error normalisation
├── types.ts          // shared DTOs (Project, Dataset, PipelinePreview, ChartConfig, etc.)
├── projects.ts       // listProjects, getProject, createProject, renameProject,
│                     //   setProjectDatasets, setProjectPipeline, setProjectCharts, deleteProject
├── datasets.ts       // listDatasets, getDatasetSchema, uploadDataset (multipart),
│                     //   getDatasetPreview, deleteDataset
├── pipeline.ts       // runPipelinePreview(projectId | spec)  → { columns, rows, totalRows, notes }
├── charts.ts         // (thin — charts live on project; helper for export-data if backend ever generates)
└── mock/             // current in-memory implementations, moved verbatim
    ├── projects.mock.ts
    ├── datasets.mock.ts
    └── pipeline.mock.ts
```

- `client.ts` reads `import.meta.env.VITE_API_BASE_URL`. When missing OR `VITE_USE_MOCK_API === "true"`, every function in `projects.ts`/`datasets.ts`/`pipeline.ts` delegates to `./mock/*`. Otherwise it hits real endpoints.
- One-line auth hook: `setAuthTokenGetter(() => string | null)` called from `__root.tsx` once Supabase auth is in. Empty no-op today.
- Errors normalise to `ApiError { status, code, message }` so UIs can keep using try/catch.

### 2. Endpoint contract (documented in `types.ts`, ready for backend to implement)

```text
GET    /projects                           → Project[]
POST   /projects                           → Project              body: { name?, datasets?: string[] }
GET    /projects/:id                       → Project
PATCH  /projects/:id                       → Project              body: Partial<Project>
DELETE /projects/:id                       → 204

GET    /datasets                           → DatasetSummary[]
POST   /datasets       (multipart: file)   → DatasetSummary
GET    /datasets/:id/schema                → { columns: Attr[] }
GET    /datasets/:id/preview?limit=200     → { columns, rows }
DELETE /datasets/:id                       → 204

POST   /pipeline/preview                   → RunResult           body: { steps: Step[], selectedCols?: string[], limit?: number }
```

`Project`, `Step`, `Attr`, `ChartConfig`, `RunResult` already exist — I will lift them into `api/types.ts` and re-export from current locations so nothing else needs renaming.

### 3. Refactor existing call sites to use the seam (zero UI change)

- `src/lib/projects-store.ts` → keep the `useProjects`/`useProject` reactive shell, but its actions (`createProject`, `renameProject`, `setProjectDatasets`, `setProjectPipeline`, `setProjectCharts`, `touchProject`) become thin wrappers that call `api/projects.ts` and update the local cache on success. With mock mode on, behaviour is identical to today.
- `src/routes/datasets.tsx`:
  - Replace hardcoded `datasetA` / `datasetB` constants with a `useQuery(['dataset-schema', name], () => api.datasets.getSchema(name))` (mock returns the current hardcoded shape).
  - `parseDatasetFile` → `api.datasets.upload(file)` (mock keeps current client-side parse + `registerDatasetTables`).
  - The "Run" preview button → `api.pipeline.preview({ steps, selectedCols })` (mock = current `runPipeline(...)`).
- `src/routes/visualisation.tsx`: reads pipeline rows through `api.pipeline.preview(...)` instead of importing `runPipeline` directly. Mock mode = no behaviour change.
- `src/routes/index.tsx`: already uses `useProjects()` — no edit needed; it'll just receive real data once `USE_MOCK` is off.
- `src/routes/ai-analysis.tsx`, `runs.$runId.tsx`, `ai-analysis.results.tsx`: **untouched** — they're already on Supabase and presumably your backend keeps using those tables. If you'd rather route them through `api/` too, I can add `api/runs.ts` in a follow-up; flagging it as an option, not doing it now to keep this PR small.

### 4. Env scaffolding

- Add `.env.example`:
  ```
  VITE_API_BASE_URL=
  VITE_USE_MOCK_API=true
  ```
- README note (3 lines) at top of `src/lib/api/index.ts` explaining: set `VITE_API_BASE_URL`, flip `VITE_USE_MOCK_API=false`, done.

### 5. React Query everywhere data crosses the seam

All `api/*` calls go through `useQuery` / `useMutation` with stable keys (`['projects']`, `['dataset-schema', id]`, `['pipeline-preview', projectId, hash(steps)]`). This gives you caching, retries, and invalidation for free the moment real endpoints land. The QueryClient already exists in `src/router.tsx`.

## Out of scope (so this stays small)

- No new UI, no design changes, no auth flow, no role system.
- No changes to `ai-analysis` / `runs` data layer (they're already wired).
- No backend code, no Supabase migrations.
- No removing Supabase client — it stays for the already-wired flows.

## Verification after build

1. App runs identically in mock mode (default). Datasets page, Visualisation, Recent Projects, Pipeline preview all behave as today.
2. Setting `VITE_USE_MOCK_API=false` + a fake `VITE_API_BASE_URL` produces network requests to the documented endpoints (visible in DevTools) and graceful `ApiError` toasts when they 404 — proving the seam works end-to-end.
3. Grep confirms `runPipeline`, `registerDatasetTables`, `parseDatasetFile`, and the in-memory `projects` array are only referenced from `src/lib/api/mock/*` — nowhere else in routes/components.

Once you approve, I'll implement in one pass and report back with the three checks above.
