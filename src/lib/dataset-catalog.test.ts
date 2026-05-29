import { describe, expect, it, vi, beforeEach } from "vitest";

let insertCall = 0;
const mockMaybeSingle = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        insertCall++;
        const error =
          insertCall === 1 && "is_shared" in row
            ? { message: "Could not find the 'is_shared' column of 'datasets' in the schema cache" }
            : null;
        return Promise.resolve({ error });
      },
    }),
  },
}));

import { ensureDatasetInSupabase } from "./dataset-catalog";

describe("ensureDatasetInSupabase", () => {
  beforeEach(() => {
    insertCall = 0;
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("retries without is_shared when column is missing", async () => {
    await ensureDatasetInSupabase({
      id: "ds-1",
      name: "GLU_J.xpt",
      row_count: 100,
    });
    expect(insertCall).toBe(2);
  });
});
