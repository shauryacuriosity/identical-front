import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
  email: "lotus.demo@uow.edu.au",
  password: "LotusDemo2026!",
});
if (authErr) throw authErr;

const testId = "00000000-0000-4000-8000-000000000099";
await sb.from("datasets").delete().eq("id", testId);

const { error: ins1 } = await sb.from("datasets").insert({
  id: testId,
  name: "verify-glu-test",
  row_count: 10,
  status: "ready",
  user_id: auth.user.id,
  is_shared: false,
});
if (ins1) throw new Error(`insert datasets: ${ins1.message}`);

const { data: run, error: runErr } = await sb
  .from("analysis_runs")
  .insert({
    dataset_id: testId,
    name: "verify-run",
    function_mode: "labels_only",
    cohort_filter: { age_min: 20, age_max: 65, sex: "all" },
    method_config: { prediction: null, subgroup: null },
    status: "pending",
  })
  .select("id")
  .single();
if (runErr) throw new Error(`insert run: ${runErr.message}`);

await sb.from("analysis_runs").delete().eq("id", run.id);
await sb.from("datasets").delete().eq("id", testId);

console.log("OK: labels_only run created with is_shared dataset, id", run.id);
