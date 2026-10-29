export type HalfDay = "AM" | "PM";

export type Category = {
  id: string;
  label: string;
  color: string; // hex
};

export type Technician = {
  id: string;
  name: string;
  email: string;
};

export type Attachment = {
  name: string;
  type: string; // mime
  dataUrl: string; // base64 data URL
};

export type Assignment = {
  id: string;
  technicianIds: string[]; // un ou plusieurs techniciens
  dateISO: string; // yyyy-mm-dd (début)
  half: HalfDay; // demi-journée de début
  endDateISO?: string; // yyyy-mm-dd (fin, défaut = dateISO)
  endHalf?: HalfDay; // demi-journée de fin (défaut = half)
  categoryId: string;
  title: string;
  address: string;
  startTime: string;
  endTime: string;
  notes?: string;
  link?: string;
  teamsUrl?: string;
  /** Ask Google Calendar to create a Meet link for this mission. */
  googleMeet?: boolean;
  /** Meet link returned by Google, shown back in the mission sheet. */
  meetUrl?: string;
  /** Weekly series anchored to dateISO, with no end date. */
  recurrence?: "weekly";
  /** RDV à confirmer : on envoie seulement un créneau réservé, sans détails. */
  toConfirm?: boolean;
  /** RDV confirmé après une période « à confirmer » : signalé par une coche verte. */
  confirmed?: boolean;
  /** Version de l'événement agenda (incrémentée pour remplacer l'événement existant). */
  sequence?: number;
  attachments?: Attachment[];
};

/** Énumère les créneaux (jour + demi-journée) couverts par une mission, week-ends inclus. */
export function assignmentSlots(a: Pick<Assignment, "dateISO" | "half" | "endDateISO" | "endHalf">): Array<{ dateISO: string; half: HalfDay }> {
  const endISO = a.endDateISO ?? a.dateISO;
  const endHalf: HalfDay = a.endHalf ?? a.half;
  const out: Array<{ dateISO: string; half: HalfDay }> = [];
  const start = new Date(a.dateISO);
  const end = new Date(endISO);
  if (end < start) return [{ dateISO: a.dateISO, half: a.half }];
  const cursor = new Date(start);
  while (cursor <= end) {
    const p = (n: number) => String(n).padStart(2, "0");
    const iso = `${cursor.getFullYear()}-${p(cursor.getMonth() + 1)}-${p(cursor.getDate())}`;
    const isFirst = iso === a.dateISO;
    const isLast = iso === endISO;
    const halves: HalfDay[] = [];
    if (isFirst && isLast) {
      if (a.half === "AM") halves.push("AM");
      if (endHalf === "PM") halves.push("PM");
      if (halves.length === 0) halves.push("PM");
    } else if (isFirst) {
      if (a.half === "AM") halves.push("AM", "PM");
      else halves.push("PM");
    } else if (isLast) {
      halves.push("AM");
      if (endHalf === "PM") halves.push("PM");
    } else {
      halves.push("AM", "PM");
    }
    for (const h of halves) out.push({ dateISO: iso, half: h });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "chantier", label: "Affaires", color: "#3b82f6" },
  { id: "maintenance", label: "Maintenance", color: "#10b981" },
  { id: "depannage", label: "Dépannage", color: "#ef4444" },
  { id: "conge", label: "Congé", color: "#f59e0b" },
  { id: "formation", label: "Formation", color: "#8b5cf6" },
  { id: "astreinte", label: "Astreinte", color: "#ec4899" },
];

export const DEFAULT_TECHNICIANS: Technician[] = [
  { id: "thomas", name: "Thomas", email: "tboileaucmc@gmail.com" },
];
