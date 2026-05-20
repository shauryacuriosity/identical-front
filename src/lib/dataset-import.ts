import * as XLSX from "xlsx";

export type AttrType = "id" | "num" | "cat";
export type Attr = { name: string; type: AttrType };

export type Row = Record<string, unknown>;
export type ParsedDataset = { attrs: Attr[]; rowCount: number; rows: Row[]; rowsAvailable: boolean };

function inferType(name: string, samples: unknown[]): AttrType {
  const lower = name.toLowerCase();
  if (lower === "id" || lower.endsWith("_id") || lower === "seqn") return "id";
  const nonEmpty = samples.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonEmpty.length === 0) return "cat";
  const allNum = nonEmpty.every((v) => {
    if (typeof v === "number") return Number.isFinite(v);
    const n = Number(v);
    return !Number.isNaN(n) && Number.isFinite(n);
  });
  return allNum ? "num" : "cat";
}

function attrsFromRows(headers: string[], rows: Record<string, unknown>[]): Attr[] {
  const sample = rows.slice(0, 200);
  return headers.map((h) => ({
    name: h,
    type: inferType(h, sample.map((r) => r[h])),
  }));
}

async function parseSheetLike(file: File): Promise<ParsedDataset> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = (() => {
    const ref = sheet["!ref"];
    if (!ref) return Object.keys(rows[0] ?? {});
    const range = XLSX.utils.decode_range(ref);
    const result: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
      if (cell && cell.v !== undefined && cell.v !== "") result.push(String(cell.v));
    }
    return result.length ? result : Object.keys(rows[0] ?? {});
  })();
  return { attrs: attrsFromRows(headers, rows), rowCount: rows.length, rows, rowsAvailable: true };
}

async function parseJson(file: File): Promise<ParsedDataset> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of objects");
  const rows = data as Record<string, unknown>[];
  const headerSet = new Set<string>();
  for (const row of rows.slice(0, 200)) {
    if (row && typeof row === "object") {
      for (const k of Object.keys(row)) headerSet.add(k);
    }
  }
  return { attrs: attrsFromRows([...headerSet], rows), rowCount: rows.length };
}

/** Decode bytes as ASCII (XPORT uses EBCDIC-like trimmed ASCII for names). */
function ascii(bytes: Uint8Array, start: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[start + i] ?? 0);
  return s.replace(/\u0000/g, " ").trimEnd();
}

/**
 * Minimal SAS XPORT v5 reader: extracts variable names + types and approximates
 * observation count. Tolerates unusual files by skipping until it finds the OBS
 * header marker.
 */
async function parseXpt(file: File): Promise<ParsedDataset> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const text = ascii(buf, 0, buf.length);

  // Find NAMESTR header to read variable count.
  const nsMatch = text.match(/HEADER RECORD\*{7}NAMESTR HEADER RECORD!{7}0{30}(\d{4})/);
  if (!nsMatch) throw new Error("Not a recognised SAS XPORT v5 file");
  const nVars = parseInt(nsMatch[1], 10);
  const nsStart = (nsMatch.index ?? 0) + 80;

  // NAMESTR records are 140 bytes each, then padded to next 80-byte boundary.
  const NAMESTR_SIZE = 140;
  const attrs: Attr[] = [];
  let totalRowLen = 0;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let i = 0; i < nVars; i++) {
    const off = nsStart + i * NAMESTR_SIZE;
    if (off + NAMESTR_SIZE > buf.length) break;
    const ntype = dv.getInt16(off, false); // big-endian, 1=num, 2=char
    const nlng = dv.getInt16(off + 4, false);
    const name = ascii(buf, off + 8, 8);
    totalRowLen += nlng;
    if (!name) continue;
    attrs.push({ name, type: inferType(name, []) === "id" ? "id" : ntype === 2 ? "cat" : "num" });
  }

  // Approximate row count from the OBS header marker.
  const obsMatch = text.match(/HEADER RECORD\*{7}OBS {5}HEADER RECORD!{7}/);
  let rowCount = 0;
  if (obsMatch && totalRowLen > 0) {
    const obsStart = (obsMatch.index ?? 0) + 80;
    const obsBytes = buf.length - obsStart;
    rowCount = Math.max(0, Math.floor(obsBytes / totalRowLen));
  }
  return { attrs, rowCount };
}

export async function parseDatasetFile(file: File): Promise<ParsedDataset> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  switch (ext) {
    case "csv":
    case "tsv":
    case "txt":
    case "xlsx":
    case "xls":
      return parseSheetLike(file);
    case "json":
      return parseJson(file);
    case "xpt":
      return parseXpt(file);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
