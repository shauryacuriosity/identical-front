import { describe, expect, it } from "vitest";
import {
  autoMapAnalysisFields,
  buildColumnMapping,
  CLINICAL_FIELDS,
  DIETARY_FIELDS,
  emptyMappings,
  TARGET_TO_CANONICAL,
} from "./column-mapping";

describe("buildColumnMapping", () => {
  it("translates confirmed targets to backend canonical names by raw column", () => {
    const clinical = emptyMappings(CLINICAL_FIELDS).map((m) =>
      m.target === "trig_mg_dl"
        ? { ...m, column: "LBXTR", score: 0.9 }
        : m.target === "glucose_fasting"
          ? { ...m, column: "LBDGLUSI", score: 0.9 }
          : m,
    );
    const dietary = emptyMappings(DIETARY_FIELDS).map((m) =>
      m.target === "sex" ? { ...m, column: "gender", score: 0.9 } : m,
    );
    const mapping = buildColumnMapping(clinical, dietary);
    expect(mapping).toEqual({ LBXTR: "LBXTR", LBDGLUSI: "LBXGLU", gender: "RIAGENDR" });
  });

  it("skips unselected columns and yields {} when nothing is mapped", () => {
    expect(buildColumnMapping(emptyMappings(CLINICAL_FIELDS), emptyMappings(DIETARY_FIELDS))).toEqual(
      {},
    );
  });

  it("has a canonical name for every clinical and dietary target", () => {
    for (const f of [...CLINICAL_FIELDS, ...DIETARY_FIELDS]) {
      expect(TARGET_TO_CANONICAL[f.target], `missing canonical for ${f.target}`).toBeTruthy();
    }
  });
});

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
