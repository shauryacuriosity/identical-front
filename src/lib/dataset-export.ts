import * as XLSX from "xlsx";
import type { RunResult } from "@/lib/pipeline-exec";

export const EXPORT_FORMATS = [
  { ext: "csv", label: "CSV (.csv)", disabled: false },
  { ext: "tsv", label: "TSV (.tsv)", disabled: false },
  { ext: "json", label: "JSON (.json)", disabled: false },
  { ext: "xlsx", label: "Excel (.xlsx)", disabled: false },
  { ext: "xpt", label: "SAS XPORT (.xpt)", disabled: true },
] as const;

export function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown, delim: string): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(delim) || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Export a pipeline or preview table to a downloadable file (client-side). */
export function exportRunResult(result: RunResult, baseName: string, ext: string) {
  const cleanName = baseName.replace(/[^\w\- ]+/g, "").trim() || "dataset";
  const filename = `${cleanName}.${ext}`;
  if (ext === "csv" || ext === "tsv") {
    const delim = ext === "csv" ? "," : "\t";
    const lines = [result.columns.join(delim)];
    for (const r of result.rows) {
      lines.push(result.columns.map((c) => csvEscape(r[c], delim)).join(delim));
    }
    downloadBlob("\uFEFF" + lines.join("\n"), filename, `text/${ext}`);
  } else if (ext === "json") {
    downloadBlob(JSON.stringify(result.rows, null, 2), filename, "application/json");
  } else if (ext === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(result.rows, { header: result.columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  }
}
