import { apiFetch, USE_MOCK } from "./client";
import type { DatasetSummary, DatasetSchema, DatasetPreview } from "./types";
import { parseDatasetFile } from "@/lib/dataset-import";
import { registerDatasetTable, getDatasetTables } from "@/lib/dataset-tables";

// --- Mock-mode schema registry --------------------------------------------
// In real mode, the backend owns schemas. In mock mode we keep a tiny
// in-memory registry so /datasets can render hardcoded + uploaded shapes.

import type { Attr } from "@/lib/dataset-import";

const mockSchemas = new Map<string, Attr[]>();
const mockMeta = new Map<string, { rowCount: number | null; uploadedAt: string | null }>();

export function __mockSeedSchema(name: string, columns: Attr[], rowCount: number | null = null) {
  mockSchemas.set(name, columns);
  if (!mockMeta.has(name)) mockMeta.set(name, { rowCount, uploadedAt: null });
}

// --- API ------------------------------------------------------------------

export async function list(): Promise<DatasetSummary[]> {
  if (USE_MOCK) {
    return [...mockSchemas.keys()].map((name) => {
      const meta = mockMeta.get(name);
      const tables = getDatasetTables();
      const rc = tables[name]?.length ?? meta?.rowCount ?? null;
      return {
        id: name,
        name,
        rowCount: rc,
        uploadedAt: meta?.uploadedAt ?? null,
        status: "ready",
      };
    });
  }
  return apiFetch<DatasetSummary[]>("/datasets");
}

export async function getSchema(id: string): Promise<DatasetSchema> {
  if (USE_MOCK) {
    const columns = mockSchemas.get(id) ?? [];
    return { id, name: id, columns };
  }
  return apiFetch<DatasetSchema>(`/datasets/${encodeURIComponent(id)}/schema`);
}

export async function upload(file: File): Promise<DatasetSummary> {
  if (USE_MOCK) {
    const parsed = await parseDatasetFile(file);
    mockSchemas.set(file.name, parsed.attrs);
    mockMeta.set(file.name, { rowCount: parsed.rowCount, uploadedAt: new Date().toISOString() });
    if (parsed.rowsAvailable) registerDatasetTable(file.name, parsed.rows);
    return {
      id: file.name,
      name: file.name,
      rowCount: parsed.rowCount,
      uploadedAt: new Date().toISOString(),
      status: "ready",
    };
  }
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<DatasetSummary>("/datasets", { method: "POST", formData: fd });
}

export async function preview(id: string, limit = 200): Promise<DatasetPreview> {
  if (USE_MOCK) {
    const rows = getDatasetTables()[id] ?? [];
    const columns = rows[0] ? Object.keys(rows[0]) : (mockSchemas.get(id) ?? []).map((a) => a.name);
    const truncated = rows.length > limit;
    return {
      id,
      columns,
      rows: truncated ? rows.slice(0, limit) : rows,
      totalRows: rows.length,
      truncated,
    };
  }
  return apiFetch<DatasetPreview>(`/datasets/${encodeURIComponent(id)}/preview`, {
    query: { limit },
  });
}

export async function remove(id: string): Promise<void> {
  if (USE_MOCK) {
    mockSchemas.delete(id);
    mockMeta.delete(id);
    return;
  }
  await apiFetch<void>(`/datasets/${encodeURIComponent(id)}`, { method: "DELETE" });
}
