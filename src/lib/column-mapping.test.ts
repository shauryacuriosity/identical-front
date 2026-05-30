import { describe, expect, it } from "vitest";
import {
  autoMapAnalysisFields,
  buildColumnMapping,
  buildExtraBpMapping,
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

  it("merges extra BP reading columns into the mapping", () => {
    const clinical = emptyMappings(CLINICAL_FIELDS).map((m) =>
      m.target === "bp_sys" ? { ...m, column: "sbp1", score: 0.9 } : m,
    );
    const extra = { sbp2: "BPXSY2", sbp3: "BPXSY3", dbp2: "BPXDI2" };
    expect(buildColumnMapping(clinical, [], extra)).toEqual({
      sbp1: "BPXSY1",
      sbp2: "BPXSY2",
      sbp3: "BPXSY3",
      dbp2: "BPXDI2",
    });
  });
});

describe("buildExtraBpMapping", () => {
  it("maps optional systolic/diastolic slots to BPXSY2-4 and BPXDI2-4", () => {
    expect(
      buildExtraBpMapping(["BPXSY2", "BPXSY3", null], [null, "BPXDI3", "BPXDI4"]),
    ).toEqual({
      BPXSY2: "BPXSY2",
      BPXSY3: "BPXSY3",
      BPXDI3: "BPXDI3",
      BPXDI4: "BPXDI4",
    });
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
