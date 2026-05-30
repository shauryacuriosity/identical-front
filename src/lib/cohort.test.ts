import { describe, expect, it } from "vitest";
import { computeCohort, normalizeSexValue, type SexFilter } from "./cohort";
import { emptyMappings, DIETARY_FIELDS, type MappingSuggestion } from "./column-mapping";

function mapped(overrides: Partial<Record<string, string>>): MappingSuggestion[] {
  return emptyMappings(DIETARY_FIELDS).map((m) =>
    overrides[m.target] ? { ...m, column: overrides[m.target]!, score: 0.9 } : m,
  );
}

const rows = [
  { RIDAGEYR: 30, RIAGENDR: 1, MetS: 1 },
  { RIDAGEYR: 45, RIAGENDR: 2, MetS: 0 },
  { RIDAGEYR: 70, RIAGENDR: 1, MetS: 1 },
  { RIDAGEYR: 18, RIAGENDR: 2, MetS: 0 },
];
const cols = ["RIDAGEYR", "RIAGENDR", "MetS"];
const all: SexFilter = "All";

describe("normalizeSexValue", () => {
  it("maps NHANES and text codes", () => {
    expect(normalizeSexValue(1)).toBe("Male");
    expect(normalizeSexValue("2")).toBe("Female");
    expect(normalizeSexValue("female")).toBe("Female");
    expect(normalizeSexValue(0)).toBeNull();
    expect(normalizeSexValue("")).toBeNull();
  });
});

describe("computeCohort", () => {
  it("filters by real age + sex columns and scales to total", () => {
    const m = mapped({ age_years: "RIDAGEYR", sex: "RIAGENDR" });
    const r = computeCohort(rows, 400, cols, m, { ageMin: 20, ageMax: 65, sex: "Male" }, "MetS");
    // Males aged 20-65 in sample: only the age-30 male (the 70yo is out of range) => 1/4
    expect(r.sampleIncluded).toBe(1);
    expect(r.included).toBe(100); // 1/4 * 400
    expect(r.canFilterAge).toBe(true);
    expect(r.canFilterSex).toBe(true);
    expect(r.sampled).toBe(true);
    expect(r.prevalence).toBe(50); // 2 of 4 labelled positive
  });

  it("ignores the sex filter when no sex column is mapped", () => {
    const m = mapped({ age_years: "RIDAGEYR" }); // no sex
    const withSex = computeCohort(rows, 100, cols, m, { ageMin: 0, ageMax: 100, sex: "Male" });
    const withAll = computeCohort(rows, 100, cols, m, { ageMin: 0, ageMax: 100, sex: all });
    expect(withSex.canFilterSex).toBe(false);
    expect(withSex.included).toBe(withAll.included); // sex selection has no effect
  });

  it("flags fake/empty datasets as not analyzable", () => {
    const fake = [{ "!!!": "?", "@@": ";" }, { "!!!": "#", "@@": "%" }];
    const r = computeCohort(fake, 2, ["!!!", "@@"], mapped({}), { ageMin: 20, ageMax: 65, sex: all });
    expect(r.analyzable).toBe(false);
    expect(r.included).toBe(0);
  });

  it("returns null prevalence when no MetS column is present", () => {
    const m = mapped({ age_years: "RIDAGEYR" });
    const r = computeCohort(rows, 4, cols, m, { ageMin: 0, ageMax: 100, sex: all });
    expect(r.prevalence).toBeNull();
    expect(r.sampled).toBe(false); // sample == total
  });
});
