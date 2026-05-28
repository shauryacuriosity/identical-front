/** Map dataset id/slot keys to human-readable file names from the API. */
export function buildDatasetLabelMap(
  datasets: { id: string; name: string }[] | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const d of datasets ?? []) {
    map[d.id] = d.name;
  }
  return map;
}

export function slotLabel(slot: string, labels: Record<string, string>): string {
  if (!slot) return "";
  return labels[slot] ?? slot;
}

export function stripFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export function projectNameFromFirstDataset(
  datasets: string[],
  labels: Record<string, string>,
): string {
  const first = datasets.find(Boolean);
  if (!first) return "";
  return stripFileExtension(slotLabel(first, labels));
}

export function resolveProjectDisplayName(
  project: { name: string; datasets: string[] },
  labels: Record<string, string>,
): string {
  const trimmed = project.name?.trim();
  if (trimmed) return trimmed;
  const derived = projectNameFromFirstDataset(project.datasets, labels);
  return derived || "Untitled project";
}
