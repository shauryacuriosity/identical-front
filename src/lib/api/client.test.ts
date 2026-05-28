import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("api client USE_MOCK", () => {
  const env = import.meta.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true when VITE_API_BASE_URL is empty", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_USE_MOCK_API", "");
    const { USE_MOCK } = await import("./client");
    expect(USE_MOCK).toBe(true);
  });

  it("is true when VITE_USE_MOCK_API is true", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("VITE_USE_MOCK_API", "true");
    const { USE_MOCK } = await import("./client");
    expect(USE_MOCK).toBe(true);
  });

  it("is false when API base URL is set and mock is not forced", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("VITE_USE_MOCK_API", "");
    const { USE_MOCK } = await import("./client");
    expect(USE_MOCK).toBe(false);
  });
});
