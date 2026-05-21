import { apiFetch, USE_MOCK } from "./client";
import type { Project } from "./types";
import type { Step } from "@/lib/pipeline-exec";
import type { ChartConfig } from "@/lib/chart-config";
import type { ProjectWorkPatch } from "@/lib/project-work";
import * as store from "@/lib/projects-store";

// Mock mode: delegate to the in-memory reactive store (the source of truth
// behind useProjects/useProject). Real mode: fetch, then sync the local
// cache so subscribed components re-render.

export async function list(): Promise<Project[]> {
  if (USE_MOCK) return store.__mockListProjects();
  const data = await apiFetch<Project[]>("/projects");
  store.__cacheReplaceAll(data);
  return data;
}

export async function get(id: string): Promise<Project | null> {
  if (USE_MOCK) return store.getProject(id);
  const data = await apiFetch<Project>(`/projects/${id}`);
  store.__cacheUpsert(data);
  return data;
}

export async function create(seed?: Partial<Project>): Promise<string> {
  if (USE_MOCK) return store.__mockCreateProject(seed);
  const data = await apiFetch<Project>("/projects", { method: "POST", body: seed ?? {} });
  store.__cacheUpsert(data);
  return data.id;
}

export async function rename(id: string, name: string): Promise<void> {
  if (USE_MOCK) return store.__mockRenameProject(id, name);
  const data = await apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: { name } });
  store.__cacheUpsert(data);
}

export async function setDatasets(id: string, datasets: string[]): Promise<void> {
  if (USE_MOCK) return store.__mockSetProjectDatasets(id, datasets);
  const data = await apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: { datasets } });
  store.__cacheUpsert(data);
}

export async function setPipeline(
  id: string,
  pipelineSteps: Step[],
  selectedAttrs: Record<string, string[]>,
): Promise<void> {
  if (USE_MOCK) return store.__mockSetProjectPipeline(id, pipelineSteps, selectedAttrs);
  const data = await apiFetch<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: { pipelineSteps, selectedAttrs },
  });
  store.__cacheUpsert(data);
}

export async function setCharts(id: string, charts: ChartConfig[]): Promise<void> {
  if (USE_MOCK) return store.__mockSetProjectCharts(id, charts);
  const data = await apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: { charts } });
  store.__cacheUpsert(data);
}

export async function touch(id: string): Promise<void> {
  if (USE_MOCK) return store.__mockTouchProject(id);
  const data = await apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: {} });
  store.__cacheUpsert(data);
}

export async function remove(id: string): Promise<void> {
  if (USE_MOCK) return store.__mockRemoveProject(id);
  await apiFetch<void>(`/projects/${id}`, { method: "DELETE" });
  store.__cacheRemove(id);
}

/** Single PATCH for datasets, pipeline stages, charts, and page drafts. */
export async function patchProject(id: string, patch: ProjectWorkPatch): Promise<Project> {
  if (USE_MOCK) {
    store.__mockPatchProject(id, patch);
    const p = store.getProject(id);
    if (!p) throw new Error("Project not found");
    return p;
  }
  const data = await apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: patch });
  store.__cacheUpsert(data);
  return data;
}
