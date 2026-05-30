import { describe, expect, it } from "vitest";
import { isLabelsOnlyMode, parseFunctionMode } from "@/lib/run-status";

describe("parseFunctionMode", () => {
  it("parses labels_only", () => {
    expect(parseFunctionMode("labels_only")).toBe("labels_only");
    expect(isLabelsOnlyMode(parseFunctionMode("labels-only"))).toBe(true);
  });

  it("defaults unknown to full", () => {
    expect(parseFunctionMode(null)).toBe("full");
    expect(parseFunctionMode("bogus")).toBe("full");
  });
});
