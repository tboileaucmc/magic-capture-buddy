import type { Json } from "@/integrations/supabase/types";

/** Call only after mission authorization; privileged writes cannot be forged by browsers. */
export async function beginInvitationAudit(userId: string, mission: {
  id: string; title: string; start: string; end: string; attendees: { email: string; displayName?: string }[];
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("invitation_sends").insert({
    user_id: userId, mission_id: mission.id, mission_title: mission.title,
    mission_start: mission.start, mission_end: mission.end, recipients: mission.attendees as unknown as Json,
  }).select("id").single();
  if (error || !data) throw new Error("Journal des invitations indisponible : aucun envoi effectué");
  return data.id;
}

export async function finishInvitationAudit(id: string, status: "sent" | "failed", eventId?: string, errorMessage?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("invitation_sends").update({
    status, completed_at: new Date().toISOString(), event_id: eventId,
    // Never persist raw provider responses, headers or credentials.
    error_message: errorMessage,
  }).eq("id", id);
  if (error) console.error("Invitation audit completion failed", id, error.code);
}