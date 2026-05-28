import { supabase } from "@/integrations/supabase/client";

/** Metadata required to register an API dataset in Supabase (FK target for analysis_runs). */
export type DatasetCatalogEntry = {
  id: string;
  name: string;
  row_count: number | null;
  status?: string;
};

/**
 * Ensure a dataset from the FastAPI registry exists in Supabase `datasets`.
 * Analysis runs reference this table via FK; the row is owned by the signed-in user.
 */
export async function ensureDatasetInSupabase(entry: DatasetCatalogEntry): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in required to register a dataset for analysis.");

  const { data: existing, error: lookupError } = await supabase
    .from("datasets")
    .select("id")
    .eq("id", entry.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return;

  const { error: insertError } = await supabase.from("datasets").insert({
    id: entry.id,
    name: entry.name,
    row_count: entry.row_count,
    status: entry.status ?? "ready",
    user_id: user.id,
    is_shared: false,
  });

  if (insertError) throw insertError;
}
