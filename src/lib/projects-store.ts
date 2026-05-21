import { useSyncExternalStore } from "react";
import type { Step } from "@/lib/pipeline-exec";
import type { ChartConfig } from "@/lib/chart-config";

export type Project = {
  id: string;
  name: string;
  datasets: string[];
  modifiedAt: string;
  pipelineSteps?: Step[];
  selectedAttrs?: Record<string, string[]>;
  charts?: ChartConfig[];
};

const listeners = new Set<() => void>();
let projects: Project[] = [
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

function emit() {
  for (const l of listeners) l();
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

function update(next: Project[]) {
  projects = next;
  emit();
}

export function createProject(seed?: Partial<Project>): string {
  const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const p: Project = {
    id,
    name: seed?.name ?? "",
    datasets: seed?.datasets ?? [],
    modifiedAt: new Date().toISOString(),
  };
  update([p, ...projects]);
  return id;
}

export function renameProject(id: string, name: string) {
  update(
    projects.map((p) =>
      p.id === id ? { ...p, name, modifiedAt: new Date().toISOString() } : p,
    ),
  );
}

export function setProjectDatasets(id: string, datasets: string[]) {
  update(
    projects.map((p) =>
      p.id === id
        ? { ...p, datasets, modifiedAt: new Date().toISOString() }
        : p,
    ),
  );
}

export function touchProject(id: string) {
  update(
    projects.map((p) =>
      p.id === id ? { ...p, modifiedAt: new Date().toISOString() } : p,
    ),
  );
}

export function setProjectPipeline(
  id: string,
  pipelineSteps: Step[],
  selectedAttrs: Record<string, string[]>,
) {
  update(
    projects.map((p) =>
      p.id === id
        ? { ...p, pipelineSteps, selectedAttrs, modifiedAt: new Date().toISOString() }
        : p,
    ),
  );
}

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
