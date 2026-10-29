import type { SupabaseClient } from "@supabase/supabase-js";
import { supportTechnicianIds } from "./planning-support";

/** Refuse l'action si le compte connecté n'a que la lecture. */
export async function assertCanEdit(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("can_edit", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Votre compte est en lecture seule");
}

type Tech = { id: string; name: string; email: string };
type PlanningData = { technicians?: Tech[]; assignments?: Array<{ id: string; technicianIds: string[] }> };

/** Full editors pass; support managers pass only when every target belongs to the support team. */
export async function assertCanEditMission(
  supabase: SupabaseClient,
  userId: string,
  target: { attendees?: string[]; missionId?: string },
) {
  const { data: full } = await supabase.rpc("can_edit", { _user_id: userId });
  if (full) return;
  const { data: sup } = await supabase.rpc("is_support_editor", { _user_id: userId });
  if (!sup) throw new Error("Votre compte est en lecture seule");
  const { data: row, error } = await supabase.from("planning_state").select("data").eq("id", "main").maybeSingle();
  if (error) throw new Error(error.message);
  const p = (row?.data ?? {}) as PlanningData;
  const techs = p.technicians ?? [];
  const support = supportTechnicianIds(techs);
  const emails = new Set(techs.filter((t) => support.has(t.id)).map((t) => t.email.toLowerCase()));
  const deny = () => { throw new Error("Droits limités aux missions du support"); };
  if (target.attendees && target.attendees.some((e) => !emails.has(e.toLowerCase()))) deny();
  if (target.missionId) {
    const a = p.assignments?.find((x) => x.id === target.missionId);
    if (a && a.technicianIds.some((id) => !support.has(id))) deny();
  }
}
