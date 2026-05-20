## Goal

Introduce a session-local "Projects" concept. A project owns a set of dataset files. The home page lists Recent Projects (not files). The Datasets page reflects which project (if any) the user is working in, supports inline rename, and lets the user re-associate to another project.

## Model (session-local, no DB)

New module `src/lib/projects-store.ts` — tiny in-memory store with `useSyncExternalStore` subscription:

```ts
type Project = {
  id: string;
  name: string;            // editable; "" means untitled (auto-fills from first dataset)
  datasets: string[];      // slot names belonging to this project, e.g. ["Dataset_A.csv"]
  modifiedAt: string;      // ISO
};
```

API:
- `useProjects()` → `Project[]` sorted by `modifiedAt desc`
- `useProject(id)` → `Project | null`
- `createProject(seed?: Partial<Project>) → id`
- `renameProject(id, name)`
- `setProjectDatasets(id, names[])`
- `touchProject(id)` — bumps `modifiedAt`

Seed with 2–3 mock projects so the home list isn't empty (e.g. "Project 1" with `Dataset_A.csv`, `Dataset_B.csv`).

## 1. Home page (`src/routes/index.tsx`)

- Section heading: **"Recent files" → "Recent Projects"**.
- Replace the Supabase `datasets` query with `useProjects()`.
- Table columns: **`Name | Files | MetS prevalence | Modified`** (drop the Type column entirely; rename Rows → Files).
  - Files cell renders `${p.datasets.length} file${...s}` (e.g. "3 files", "1 file", "0 files" greyed).
- Row click navigates to `/datasets?projectId=<id>` (instead of `datasetId`).
- "New Dataset" tile keeps current `to="/datasets"` (no `projectId` → unassociated path on the Datasets page).
- MetS prevalence: leave as `—` for now (not in the project model); keep column for parity.
- Adjust grid template to remove the Type column (collapse from 6 cols to 5).

## 2. Datasets page (`src/routes/datasets.tsx`)

### Search params
Replace `datasetId` validator with:
```ts
projectId: string | undefined
```
(Drop the existing single-dataset Supabase query — no longer used.)

### Project context resolution
- Read `projectId` from `Route.useSearch()`.
- If present: `project = useProject(projectId)`; initial `datasetSlots` ← `project.datasets`.
- If absent: no project; `datasetSlots` defaults to `[]` (was `["Dataset_A.csv"]`). Heading shows "No project associated" in `text-ink-3` (muted).

### New `ProjectHeader` component (replaces the current `<h1>` + subtitle block)

A Google-Docs-style title bar:

```
[ Project name input (or "No project associated" muted) ]   [ ▾ Switch project ]
```

- Title is a borderless `<input>` styled as the heading (`text-[22px] text-ink`, transparent bg, focus shows hairline). When `projectId` is set, edits call `renameProject`. When no project, the title shows "No project associated" as muted, non-editable text.
- Dropdown trigger ("Switch project ▾") opens a small popover listing existing projects + a "New project" item. Selecting one calls `navigate({ to: "/datasets", search: { projectId: chosen.id } })`. "New project" creates an empty project and navigates to it.

### Auto-name behaviour (Google-Docs style)

When the current project's `name === ""` (untitled), the title input shows a muted placeholder of the first dataset slot's name (sans extension) and treats that as the effective name. On first edit, persist whatever the user types via `renameProject`. Additionally, when the first dataset is added/changed and the name is still empty, persist that as the default name via `renameProject` (user can still edit any time).

### Dataset slot ↔ project sync

- On every change to `datasetSlots` (add/remove/replace, file import success), if `projectId` is set call `setProjectDatasets(projectId, datasetSlots)` + `touchProject(projectId)`.
- If the user is in the "no project associated" state and imports/adds a dataset, do NOT auto-create a project — keep the local-only flow. (User can switch via the Switch project menu to associate.)

### Re-association via dropdown
Selecting a different project navigates to that project's URL, which re-seeds `datasetSlots` from the chosen project's stored list. This satisfies "Dataset A and Dataset B is linked to Project 1" — each project's slot list is independent.

## Files

- New: `src/lib/projects-store.ts`
- Edited: `src/routes/index.tsx` (Recent Projects table, columns, navigation)
- Edited: `src/routes/datasets.tsx` (search param, ProjectHeader, slot sync, drop `datasetQ`)

## Not touched

`dataset-import.ts`, `__root.tsx`, styles, pipeline editor, other routes.

## Open assumption

Recent Projects MetS prevalence stays as `—` until a separate request adds project-level metrics. Flag if you want me to drop that column instead.
