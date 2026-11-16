export type InvitationStatus = "pending" | "sent" | "failed";
export function invitationStatusLabel(status: string) {
  return status === "sent" ? "Envoi accepté par Google" : status === "failed" ? "Échec de l’envoi" : "En cours · résultat non confirmé";
}
export function isInvitationAdministrator(role: string | null) { return role === "admin"; }