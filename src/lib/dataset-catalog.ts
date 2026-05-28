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
 * Analysis runs reference this table via FK; uploads only register locally today.
 */
export async function ensureDatasetInSupabase(entry: DatasetCatalogEntry): Promise<void> {
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
  });

  if (insertError) throw insertError;
}
