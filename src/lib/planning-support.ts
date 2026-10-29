/** Support team = technicians from the first "BRABANT" onward, matching the grid divider and the DB trigger. */
export function supportTechnicianIds(techs: Array<{ id: string; name: string }>): Set<string> {
  const i = techs.findIndex((t) => t.name.toUpperCase().includes("BRABANT"));
  return new Set(i < 0 ? [] : techs.slice(i).map((t) => t.id));
}

/** A support manager may only touch missions whose technicians are all in the support team. */
export function isSupportOnly(technicianIds: string[], support: Set<string>): boolean {
  return technicianIds.length > 0 && technicianIds.every((id) => support.has(id));
}
