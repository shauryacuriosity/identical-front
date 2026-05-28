import { useSyncExternalStore } from "react";
import type { Step } from "@/lib/pipeline-exec";
import type { ChartConfig } from "@/lib/chart-config";
import type { AnalysisDraft, ChartDraft } from "@/lib/project-work";
import * as api from "@/lib/api/projects";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";
const REAL_API_MODE = !FORCE_MOCK && !!BASE_URL;

export type Project = {
  id: string;
  name: string;
  datasets: string[];
  modifiedAt: string;
  pipelineSteps?: Step[];
  selectedAttrs?: Record<string, string[]>;
  charts?: ChartConfig[];
  chartDraft?: ChartDraft | null;
  analysisDraft?: AnalysisDraft | null;
};

const MOCK_SEED_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Project 1",
    datasets: ["Dataset_A.csv", "Dataset_B.csv"],
    modifiedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "p2",
    name: "Project 2",
    datasets: ["Dataset_A.csv"],
    modifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

let invalidateProjectsQuery: (() => void) | null = null;

export function setProjectsQueryInvalidator(fn: () => void) {
  invalidateProjectsQuery = fn;
}

function notifyProjectsQuery() {
  invalidateProjectsQuery?.();
}

// ─── Reactive cache ────────────────────────────────────────────────────────
// In mock mode this IS the source of truth.
// In real mode it's a write-through cache populated by api/projects.ts.

const listeners = new Set<() => void>();
let projects: Project[] = REAL_API_MODE ? [] : [...MOCK_SEED_PROJECTS];

// ─── Hydration state (real-mode only) ─────────────────────────────────────
// Lets UI render a skeleton while the first /projects fetch is in flight,
// and an error state (with Retry) when it fails.

export type HydrationStatus = "idle" | "loading" | "success" | "error";
export type HydrationState = { status: HydrationStatus; error: Error | null };

const hydrationListeners = new Set<() => void>();
let hydrationState: HydrationState = REAL_API_MODE
  ? { status: "loading", error: null }
  : { status: "success", error: null };

function emitHydration() {
  for (const l of hydrationListeners) l();
}
function subscribeHydration(l: () => void) {
  hydrationListeners.add(l);
  return () => {
    hydrationListeners.delete(l);
  };
}
function getHydrationSnapshot() {
  return hydrationState;
}
function setHydrationState(next: HydrationState) {
  hydrationState = next;
  emitHydration();
}

export function useProjectsHydration(): HydrationState {
  return useSyncExternalStore(subscribeHydration, getHydrationSnapshot, getHydrationSnapshot);
}

export async function hydrateProjectsFromApi(): Promise<void> {
  if (!REAL_API_MODE) {
    setHydrationState({ status: "success", error: null });
    return;
  }
  setHydrationState({ status: "loading", error: null });
  try {
    await api.list();
    setHydrationState({ status: "success", error: null });
    notifyProjectsQuery();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    setHydrationState({ status: "error", error });
    console.error("[projects-store] Failed to hydrate projects from API:", err);
  }
}

/** Public alias suitable for a "Retry" button on the home page. */
export function refetchProjects(): Promise<void> {
  return hydrateProjectsFromApi();
}

void hydrateProjectsFromApi();

function emit() {
  for (const l of listeners) l();
}
function commit(next: Project[]) {
  projects = next;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function getSnapshot() {
  return projects;
}

export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function useProject(id: string | undefined): Project | null {
  const list = useProjects();
  if (!id) return null;
  return list.find((p) => p.id === id) ?? null;
}
export function getProject(id: string | undefined): Project | null {
  if (!id) return null;
  return projects.find((p) => p.id === id) ?? null;
}

// ─── Cache mutators (used by api/projects.ts after real fetches) ──────────

export function __cacheReplaceAll(next: Project[]) {
  commit(next);
  notifyProjectsQuery();
}
export function __cacheUpsert(p: Project) {
  const idx = projects.findIndex((x) => x.id === p.id);
  if (idx === -1) commit([p, ...projects]);
  else commit(projects.map((x) => (x.id === p.id ? p : x)));
  notifyProjectsQuery();
}
export function __cacheRemove(id: string) {
  commit(projects.filter((p) => p.id !== id));
  notifyProjectsQuery();
}

// ─── Mock-mode action implementations ─────────────────────────────────────
// These are called from api/projects.ts when VITE_USE_MOCK_API is on.

export function __mockListProjects(): Project[] {
  return projects;
}
export function __mockCreateProject(seed?: Partial<Project>): string {
  const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const p: Project = {
    id,
    name: seed?.name ?? "",
    datasets: seed?.datasets ?? [],
    modifiedAt: new Date().toISOString(),
  };
  commit([p, ...projects]);
  return id;
}
export function __mockRenameProject(id: string, name: string) {
  commit(
    projects.map((p) => (p.id === id ? { ...p, name, modifiedAt: new Date().toISOString() } : p)),
  );
}
export function __mockSetProjectDatasets(id: string, datasets: string[]) {
  commit(
    projects.map((p) =>
      p.id === id ? { ...p, datasets, modifiedAt: new Date().toISOString() } : p,
    ),
  );
}
export function __mockTouchProject(id: string) {
  commit(projects.map((p) => (p.id === id ? { ...p, modifiedAt: new Date().toISOString() } : p)));
}
export function __mockSetProjectPipeline(
  id: string,
  pipelineSteps: Step[],
  selectedAttrs: Record<string, string[]>,
) {
  commit(
    projects.map((p) =>
      p.id === id
        ? { ...p, pipelineSteps, selectedAttrs, modifiedAt: new Date().toISOString() }
        : p,
    ),
  );
}
export function __mockSetProjectCharts(id: string, charts: ChartConfig[]) {
  commit(
    projects.map((p) => (p.id === id ? { ...p, charts, modifiedAt: new Date().toISOString() } : p)),
  );
}
export function __mockRemoveProject(id: string) {
  commit(projects.filter((p) => p.id !== id));
}
export function __mockPatchProject(id: string, patch: Partial<Project>) {
  commit(
    projects.map((p) =>
      p.id === id ? { ...p, ...patch, modifiedAt: new Date().toISOString() } : p,
    ),
  );
}

// ─── Public action API (thin wrappers around api/projects.ts) ─────────────
// Existing call sites can keep using these; they delegate to the seam,
// which in turn either hits the backend or the mock implementations above.

export function createProject(seed?: Partial<Project>): string {
  // Sync-return contract preserved for callers that navigate immediately
  // off the returned id (e.g. the "New project" dropdown on Datasets).
  //
  // Mock mode: local insert is the source of truth.
  // Real mode: optimistically insert locally so the UI updates instantly,
  // then persist via the API in the background. On API success we drop the
  // optimistic placeholder (the server's row was upserted into the cache by
  // api.create). On API failure we roll back the optimistic insert.
  //
  // Callers that need the server-issued id can use createProjectAsync().
  const tempId = __mockCreateProject(seed);
  if (!REAL_API_MODE) return tempId;

  void api
    .create(seed)
    .then((realId) => {
      const temp = projects.find((p) => p.id === tempId);
      __cacheRemove(tempId);
      if (temp) {
        const server = projects.find((p) => p.id === realId);
        __cacheUpsert({ ...(server ?? temp), ...temp, id: realId });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("lotus:project-id-remapped", {
            detail: { from: tempId, to: realId },
          }),
        );
      }
    })
    .catch((err) => {
      __cacheRemove(tempId);
      console.error(
        "[projects-store] createProject API call failed; rolled back optimistic insert:",
        err,
      );
    });

  return tempId;
}

/**
 * Async variant of createProject. Resolves with the server-issued id in
 * real-API mode (or the local mock id in mock mode). Additive helper for
 * future callers that want to await the persistence step before navigating.
 */
export async function createProjectAsync(seed?: Partial<Project>): Promise<string> {
  if (!REAL_API_MODE) return __mockCreateProject(seed);
  const tempId = __mockCreateProject(seed);
  try {
    const realId = await api.create(seed);
    __cacheRemove(tempId);
    return realId;
  } catch (err) {
    __cacheRemove(tempId);
    throw err;
  }
}

export function renameProject(id: string, name: string) {
  void api.rename(id, name);
}
export function setProjectDatasets(id: string, datasets: string[]) {
  void api.setDatasets(id, datasets);
}
export function touchProject(id: string) {
  void api.touch(id);
}
export function setProjectPipeline(
  id: string,
  pipelineSteps: Step[],
  selectedAttrs: Record<string, string[]>,
) {
  void api.setPipeline(id, pipelineSteps, selectedAttrs);
}
export function setProjectCharts(id: string, charts: ChartConfig[]) {
  void api.setCharts(id, charts);
}

// ─── Utility ──────────────────────────────────────────────────────────────

export function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `last week`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
