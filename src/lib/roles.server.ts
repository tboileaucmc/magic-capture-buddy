import type { SupabaseClient } from "@supabase/supabase-js";

/** Refuse l'action si le compte connecté n'a que la lecture. */
export async function assertCanEdit(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("can_edit", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Votre compte est en lecture seule");
}
