import { describe, expect, it } from "vitest";
import { autoMapAnalysisFields } from "./column-mapping";

describe("autoMapAnalysisFields", () => {
  it("maps NHANES GLU_J columns to glucose, not triglycerides", () => {
    const columns = ["LBXGLU", "LBDGLUSI", "LBXTR", "SEQN"];
    const rows = [
      { LBXGLU: 95, LBDGLUSI: 5.2, LBXTR: 140, SEQN: 1 },
      { LBXGLU: 102, LBDGLUSI: 5.7, LBXTR: 160, SEQN: 2 },
    ];
    const { clinical } = autoMapAnalysisFields(columns, rows);
    const glucose = clinical.find((m) => m.target === "glucose_fasting");
    const trig = clinical.find((m) => m.target === "trig_mg_dl");
    expect(glucose?.column).toMatch(/LBXGLU|LBDGLUSI/);
    expect(trig?.column).toBe("LBXTR");
    expect(trig?.column).not.toMatch(/GLU/i);
  });
});
