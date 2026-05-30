import { describe, expect, it } from "vitest";
import { isDatasetUuid, slotLabel, slotLabelTitle } from "./dataset-labels";

const UUID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("slotLabel", () => {
  it("returns mapped name when present", () => {
    expect(slotLabel(UUID, { [UUID]: "GLU_J.xpt" })).toBe("GLU_J.xpt");
  });

  it("shows loading placeholder for unknown UUID while catalog loads", () => {
    expect(slotLabel(UUID, {}, { labelsLoading: true })).toBe("Loading dataset…");
  });

  it("truncates unknown UUID when not loading", () => {
    expect(slotLabel(UUID, {})).toBe("a1b2c3d4…");
  });

  it("returns raw slot for non-UUID unknown ids", () => {
    expect(slotLabel("Dataset_A.csv", {})).toBe("Dataset_A.csv");
  });
});

describe("slotLabelTitle", () => {
  it("returns tooltip for unknown UUID when not loading", () => {
    expect(slotLabelTitle(UUID, {})).toBe("Unknown dataset — refresh or re-link");
  });

  it("returns full id while loading for hover context", () => {
    expect(slotLabelTitle(UUID, {}, { labelsLoading: true })).toBe(UUID);
  });

  it("returns undefined for known slots", () => {
    expect(slotLabelTitle(UUID, { [UUID]: "GLU_J.xpt" })).toBeUndefined();
  });
});

describe("isDatasetUuid", () => {
  it("matches standard UUIDs", () => {
    expect(isDatasetUuid(UUID)).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(isDatasetUuid("Dataset_A.csv")).toBe(false);
  });
});
