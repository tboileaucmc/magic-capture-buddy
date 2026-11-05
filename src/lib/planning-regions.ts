export const PLANNING_GROUPS = {
  all: "Toutes les équipes",
  west: "Région Ouest",
  east: "Région Est",
  paris: "Région Parisienne",
  support: "Support",
} as const;

export type PlanningGroup = keyof typeof PLANNING_GROUPS;

export function technicianSection(name: string): Exclude<PlanningGroup, "all"> | null {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (normalized.includes("GERNIGON") && normalized.includes("ERIC")) return "west";
  if (normalized.includes("CUNHA") && normalized.includes("VICTOR")) return "east";
  if (normalized.includes("DAVID") && (normalized.includes("MICHAEL") || normalized.includes("MICKAEL"))) return "paris";
  if (normalized.includes("BRABANT")) return "support";
  return null;
}

/** Groups follow the existing ordered section dividers, without changing planning data. */
export function filterPlanningTechnicians<T extends { name: string }>(technicians: T[], group: PlanningGroup): T[] {
  if (group === "all") return technicians;
  let current: Exclude<PlanningGroup, "all"> | null = null;
  return technicians.filter((technician) => {
    current = technicianSection(technician.name) ?? current;
    return current === group;
  });
}