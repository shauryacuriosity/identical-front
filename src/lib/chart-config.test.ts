import { describe, expect, it } from "vitest";
import { buildChartData } from "./chart-config";
import type { ChartConfig } from "./chart-config";

describe("buildChartData integer binning", () => {
  it("uses integer bin boundaries for integer ID columns like SEQN", () => {
    // 40 distinct integer SEQN values forces auto-binning (>30 distinct).
    const rows = Array.from({ length: 40 }, (_, i) => ({ SEQN: 83731 + i * 7, val: i }));
    const columns = ["SEQN", "val"];
    const config = { chartType: "line", x: "SEQN", y: "val", agg: "count" } as unknown as ChartConfig;
    const built = buildChartData(rows, columns, config);
    const labels = built.data.map((d) => String(d.SEQN));
    expect(labels.length).toBeGreaterThan(1);
    // Bin labels are "lo–hi" ranges; none of the boundaries should have decimals.
    for (const label of labels) {
      expect(label, `label ${label} should have integer boundaries`).not.toMatch(/\d\.\d/);
    }
  });
});
