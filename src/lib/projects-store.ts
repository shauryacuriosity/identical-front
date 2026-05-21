import { useSyncExternalStore } from "react";
import type { Step } from "@/lib/pipeline-exec";
import type { ChartConfig } from "@/lib/chart-config";
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

async function hydrateProjectsFromApi() {
  if (!REAL_API_MODE) return;
  try {
    await api.list();
    notifyProjectsQuery();
  } catch (err) {
    console.error("[projects-store] Failed to hydrate projects from API:", err);
  }
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
  commit(projects.map((p) => (p.id === id ? { ...p, name, modifiedAt: new Date().toISOString() } : p)));
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
    projects.map((p) =>
      p.id === id ? { ...p, charts, modifiedAt: new Date().toISOString() } : p,
    ),
  );
}
export function __mockRemoveProject(id: string) {
  commit(projects.filter((p) => p.id !== id));
}

// ─── Public action API (thin wrappers around api/projects.ts) ─────────────
// Existing call sites can keep using these; they delegate to the seam,
// which in turn either hits the backend or the mock implementations above.

export function createProject(seed?: Partial<Project>): string {
  // Sync-return contract for callers that need to navigate immediately.
  // Mock mode: mutate locally and return the new ID.
  // Real mode: callers that need server-issued IDs should use
  //   `await api.projects.create(seed)` directly and navigate on resolve.
  return __mockCreateProject(seed);
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
