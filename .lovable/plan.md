# Route pipeline reads through the API seam (React Query)

## Goal

Stop importing `runPipeline` directly in page components. Have `datasets.tsx` and `visualisation.tsx` fetch pipeline results through `api.pipeline.preview(...)` using TanStack Query, so a real backend can drop in by flipping `VITE_USE_MOCK_API=false` with zero page edits.

## Pre-flight (already in place — no changes)

- `@tanstack/react-query` v5 is installed.
- `src/routes/__root.tsx` already wraps `<Outlet />` in `QueryClientProvider` with the per-request `QueryClient` from router context.
- `src/lib/api/pipeline.ts` already exposes `preview({ steps, selectedCols?, limit? })` returning `RunResult`, branching on `USE_MOCK`.
- `src/router.tsx` already sets `defaultPreloadStaleTime: 0`.

Nothing under `src/lib/api/` is touched. Mock logic is unchanged.

## Changes

### 1. `src/routes/visualisation.tsx`

- Remove `import { runPipeline } from "@/lib/pipeline-exec"`.
- Add `import { useQuery } from "@tanstack/react-query"` and `import * as api from "@/lib/api"`.
- Replace the `useMemo`-wrapped `runPipeline(...)` block (lines ~147–159) with:

  ```ts
  const selectedCols = useMemo(() => {
    const out: string[] = [];
    for (const arr of Object.values(project?.selectedAttrs ?? {})) {
      for (const c of arr) if (!out.includes(c)) out.push(c);
    }
    return out;
  }, [project]);

  const pipelineQuery = useQuery({
    queryKey: ["pipeline", projectId, project?.pipelineSteps, selectedCols, "full"],
    queryFn: () => api.pipeline.preview({
      steps: project!.pipelineSteps,
      selectedCols,
      limit: Number.POSITIVE_INFINITY,
    }),
    enabled: !!project?.pipelineSteps?.length,
    staleTime: 5_000,
  });

  const columns = pipelineQuery.data?.columns ?? [];
  const rows    = pipelineQuery.data?.rows ?? [];
  const isPipelineLoading = pipelineQuery.isFetching;
  const pipelineError = pipelineQuery.error as Error | null;
  ```

- Subtle loading state: in the chart canvas area, when `isPipelineLoading && !pipelineQuery.data`, render an existing-styled skeleton/spinner row above the chart (single coral pulse div, no layout shift). When `pipelineError` is set, show the same empty-state card the page already uses for "no rows" but with the error message in `text-ink-2`.
- Empty state (`!project` or empty `pipelineSteps`) is unchanged because `pipelineQuery.enabled` is false → `data` undefined → `columns.length === 0` path renders the existing empty card.

### 2. `src/routes/datasets.tsx`

- Remove `runPipeline` import; keep the `Step`/`StepKind` type imports from `@/lib/pipeline-exec` (types only — allowed; seam re-exports same types).
- Replace the local `tables` registry and the two `useMemo(runPipeline(...))` calls (lines ~1238–1276) with two `useQuery` calls, both keyed off the same inputs and differing only in `limit`:

  ```ts
  // Tables are still registered into the global dataset table store via the
  // existing useEffect — that's what api.pipeline.preview reads from in mock mode.
  const baseKey = ["pipeline", "datasets-page", steps, selectedCols] as const;

  const previewQuery = useQuery({
    queryKey: [...baseKey, "preview-200"],
    queryFn: () => api.pipeline.preview({ steps, selectedCols, limit: 200 }),
    enabled: steps.length > 0,
    staleTime: 5_000,
    placeholderData: (prev) => prev, // keep last result visible while refetching
  });
  const fullQuery = useQuery({
    queryKey: [...baseKey, "full"],
    queryFn: () => api.pipeline.preview({ steps, selectedCols, limit: Number.POSITIVE_INFINITY }),
    enabled: steps.length > 0,
    staleTime: 5_000,
    placeholderData: (prev) => prev,
  });

  const EMPTY_RESULT: RunResult = { columns: [], rows: [], totalRows: 0, truncated: false, notes: [] };
  const previewResult = previewQuery.data ?? EMPTY_RESULT;
  const fullResult    = fullQuery.data    ?? EMPTY_RESULT;
  ```

- Re-type the two component props that use `ReturnType<typeof runPipeline>` (lines 944, 1040, 1064) to `RunResult` imported from `@/lib/api`.
- Subtle loading: in the preview table header strip, replace the static row-count badge with one that shows a faint coral "·" pulse while `previewQuery.isFetching`. No layout changes.
- Errors: pipe `previewQuery.error?.message` into the existing notes banner under the preview table (already renders `result.notes`); push the message into a single-element array when present.

### 3. Verification (mock + simulated-real)

1. **Mock mode (default).** `VITE_USE_MOCK_API=true`. Confirm `/datasets` preview & full result match prior render; `/visualisation` chart builds for a project with a saved pipeline and renders the empty state for an empty pipeline.
2. **Simulated real mode.** Temporarily edit `src/lib/api/pipeline.ts` *in a local stash only* to wrap the mock branch in `await new Promise(r => setTimeout(r, 600))` (do NOT commit this — purely for verification screenshots), set `VITE_USE_MOCK_API=true`, reload. Confirm the new loading affordance appears in both pages, then the data renders identically. Revert the stash.
3. **Network mode smoke.** With `VITE_API_BASE_URL=http://localhost:9999` and `VITE_USE_MOCK_API=false`, confirm the pages render the empty/error UI and the network tab shows `POST /pipeline/preview`, proving the seam is wired.

## Files touched

- `src/routes/visualisation.tsx`
- `src/routes/datasets.tsx`

## Out of scope

- No edits to `src/lib/api/**`, `src/lib/pipeline-exec.ts`, `src/lib/dataset-tables.ts`.
- No edits to `ai-analysis.tsx`, `ai-analysis.results.tsx`, `runs.$runId.tsx`.
- No new dependencies (react-query already installed).
- No visible layout changes.
