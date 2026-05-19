import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db-types";

const SUPABASE_URL = "https://poizespthezmvrfhcyps.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaXplc3B0aGV6bXZyZmhjeXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjI3NDYsImV4cCI6MjA5NDczODc0Nn0.2GAhcXtfJoJIMrYGMYJan-IgQBves4BHLlFmuMngf_s";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
