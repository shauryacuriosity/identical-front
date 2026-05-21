// ─────────────────────────────────────────────────────────────────────────────
// Frontend ↔ backend API seam.
//
// To wire the real backend:
//   1. Set VITE_API_BASE_URL (e.g. https://api.example.com) in your env.
//   2. Set VITE_USE_MOCK_API=false (or leave unset — mock is off by default
//      when VITE_API_BASE_URL is present).
//   3. Implement the endpoints documented in ./types.ts and the per-module
//      files below. No other frontend code needs to change.
//
// Endpoint contract:
//   GET    /projects                           → Project[]
//   POST   /projects                           → Project   body: Partial<Project>
//   GET    /projects/:id                       → Project
//   PATCH  /projects/:id                       → Project   body: Partial<Project>
//   DELETE /projects/:id                       → 204
//
//   GET    /datasets                           → DatasetSummary[]
//   POST   /datasets       (multipart: file)   → DatasetSummary
//   GET    /datasets/:id/schema                → DatasetSchema
//   GET    /datasets/:id/preview?limit=        → DatasetPreview
//   DELETE /datasets/:id                       → 204
//
//   POST   /pipeline/preview                   → RunResult
//            body: { steps: Step[], selectedCols?: string[], limit?: number }
// ─────────────────────────────────────────────────────────────────────────────

export * as projects from "./projects";
export * as datasets from "./datasets";
export * as pipeline from "./pipeline";
export * as runs from "./runs";
export { USE_MOCK, setAuthTokenGetter } from "./client";
export { ApiError } from "./types";
export type {
  Project,
  Step,
  StepKind,
  Attr,
  AttrType,
  Row,
  RunResult,
  ChartConfig,
  ChartType,
  Agg,
  BuiltChart,
  DatasetSummary,
  DatasetSchema,
  DatasetPreview,
} from "./types";
