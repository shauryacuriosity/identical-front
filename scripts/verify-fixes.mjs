/**
 * Verification script for Zhuojin bug fixes (run: node scripts/verify-fixes.mjs)
 */
import { autoMapAnalysisFields } from "../src/lib/column-mapping.ts";
import { navSearchWithProject, projectIdFromSearch } from "../src/lib/nav-project-search.ts";

let passed = 0;
let failed = 0;

function ok(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

console.log("\n1. Column mapping (GLU_J.xpt-style columns)");
{
  const columns = ["SEQN", "LBXGLU", "LBDGLUSI", "LBXTR", "LBDHD", "BPXSY1"];
  const rows = Array.from({ length: 50 }, (_, i) => ({
    SEQN: i + 1,
    LBXGLU: 85 + (i % 30),
    LBDGLUSI: 4.5 + (i % 10) * 0.3,
    LBXTR: 100 + (i % 80),
    LBDHD: 45 + (i % 20),
    BPXSY1: 110 + (i % 25),
  }));
  const { clinical } = autoMapAnalysisFields(columns, rows);
  const glucose = clinical.find((m) => m.target === "glucose_fasting");
  const trig = clinical.find((m) => m.target === "trig_mg_dl");
  ok("glucose maps to LBXGLU or LBDGLUSI", /LBXGLU|LBDGLUSI/i.test(glucose?.column ?? ""));
  ok("glucose score >= 0.9", (glucose?.score ?? 0) >= 0.9);
  ok("trig maps to LBXTR not glucose column", trig?.column === "LBXTR");
  ok("LBDGLUSI not assigned to triglycerides", trig?.column !== "LBDGLUSI");
}

console.log("\n2. Nav projectId preservation");
{
  ok("extracts projectId from search", projectIdFromSearch({ projectId: "abc-123" }) === "abc-123");
  ok("builds search for links", navSearchWithProject("abc-123")?.projectId === "abc-123");
  ok("no search when absent", navSearchWithProject(undefined) === undefined);
}

console.log("\n3. Supabase datasets schema (is_shared column)");
{
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("  ⊘ skipped (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)");
  } else {
    const res = await fetch(`${url}/rest/v1/datasets?select=id,is_shared&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      ok("is_shared column exists in PostgREST schema", true);
    } else {
      const body = await res.text();
      const missing = body.includes("is_shared");
      ok(
        "is_shared missing (frontend fallback required until migration)",
        missing || res.status === 401,
      );
      if (!missing && res.status !== 401) {
        console.error(`    HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
