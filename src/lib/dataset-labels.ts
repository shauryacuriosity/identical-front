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

const DATASET_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDatasetUuid(value: string): boolean {
  return DATASET_UUID_RE.test(value);
}

export type SlotLabelOptions = {
  labelsLoading?: boolean;
};

export function slotLabel(
  slot: string,
  labels: Record<string, string>,
  options?: SlotLabelOptions,
): string {
  if (!slot) return "";
  const known = labels[slot];
  if (known) return known;
  if (options?.labelsLoading && isDatasetUuid(slot)) return "Loading dataset…";
  if (isDatasetUuid(slot)) return `${slot.slice(0, 8)}…`;
  return slot;
}

export function slotLabelTitle(
  slot: string,
  labels: Record<string, string>,
  options?: SlotLabelOptions,
): string | undefined {
  if (!slot || labels[slot]) return undefined;
  if (options?.labelsLoading && isDatasetUuid(slot)) return slot;
  if (isDatasetUuid(slot)) return "Unknown dataset — refresh or re-link";
  return undefined;
}

export function stripFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export function projectNameFromFirstDataset(
  datasets: string[],
  labels: Record<string, string>,
  options?: SlotLabelOptions,
): string {
  const first = datasets.find(Boolean);
  if (!first) return "";
  return stripFileExtension(slotLabel(first, labels, options));
}

export function resolveProjectDisplayName(
  project: { name: string; datasets: string[] },
  labels: Record<string, string>,
  options?: SlotLabelOptions,
): string {
  const trimmed = project.name?.trim();
  if (trimmed) return trimmed;
  const derived = projectNameFromFirstDataset(project.datasets, labels, options);
  return derived || "Untitled project";
}
