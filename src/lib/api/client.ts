import { ApiError } from "./types";

// ---- Configuration --------------------------------------------------------

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/** True when the frontend should serve data from in-memory mocks instead of hitting a real backend. */
export const USE_MOCK = FORCE_MOCK || !BASE_URL;

// ---- Auth -----------------------------------------------------------------

let authTokenGetter: () => string | null | Promise<string | null> = () => null;

/** Wire up once (e.g. in __root.tsx) when auth is added. */
export function setAuthTokenGetter(fn: () => string | null | Promise<string | null>) {
  authTokenGetter = fn;
}

// ---- Fetch wrapper --------------------------------------------------------

type RequestOpts = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;       // JSON-serialized
  formData?: FormData;  // multipart; overrides body
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  if (USE_MOCK) {
    throw new ApiError(
      500,
      "MOCK_MODE",
      `apiFetch called in mock mode (${opts.method ?? "GET"} ${path}). The mock branch should have handled this.`,
    );
  }

  const url = new URL(BASE_URL + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  const token = await authTokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body,
      signal: opts.signal,
    });
  } catch (e) {
    throw new ApiError(0, "NETWORK", e instanceof Error ? e.message : "Network error");
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload && String((payload as { message: unknown }).message)) ||
      (typeof payload === "string" && payload) ||
      res.statusText ||
      "Request failed";
    const code =
      (payload && typeof payload === "object" && "code" in payload && String((payload as { code: unknown }).code)) ||
      `HTTP_${res.status}`;
    throw new ApiError(res.status, code, message);
  }

  return payload as T;
}
