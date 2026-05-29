/** Preserve ?projectId= across Datasets / Visualisation / AI Analysis tab navigation. */
export function projectIdFromSearch(search: unknown): string | undefined {
  if (!search || typeof search !== "object") return undefined;
  const id = (search as { projectId?: unknown }).projectId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export function navSearchWithProject(
  projectId: string | undefined,
): { projectId: string } | undefined {
  return projectId ? { projectId } : undefined;
}
