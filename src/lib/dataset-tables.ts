import { useSyncExternalStore } from "react";
import type { Row } from "@/lib/dataset-import";

// Global, in-memory registry mapping dataset slot name → rows.
// Populated by /datasets when the user imports files (and seeded with mocks).
// Read by /visualisation so charts can run the same pipeline that Datasets
// previews, without re-uploading data.

const tables: Record<string, Row[]> = {};
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function registerDatasetTable(name: string, rows: Row[]) {
  tables[name] = rows;
  emit();
}

export function registerDatasetTables(entries: Record<string, Row[]>) {
  let changed = false;
  for (const [k, v] of Object.entries(entries)) {
    if (tables[k] !== v) {
      tables[k] = v;
      changed = true;
    }
  }
  if (changed) emit();
}

export function getDatasetTables(): Record<string, Row[]> {
  return tables;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return tables;
}

export function useDatasetTables(): Record<string, Row[]> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
