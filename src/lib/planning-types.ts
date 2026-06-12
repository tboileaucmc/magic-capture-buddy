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
  technicianId: string;
  dateISO: string; // yyyy-mm-dd (début)
  half: HalfDay; // demi-journée de début
  endDateISO?: string; // yyyy-mm-dd (fin, défaut = dateISO)
  endHalf?: HalfDay; // demi-journée de fin (défaut = half)
  categoryId: string;
  title: string; // affaire / mission
  address: string;
  startTime: string; // "08:00"
  endTime: string; // "12:00"
  notes?: string;
  link?: string;
  attachments?: Attachment[];
};

/** Énumère les créneaux (jour ouvré + demi-journée) couverts par une mission. */
export function assignmentSlots(a: Pick<Assignment, "dateISO" | "half" | "endDateISO" | "endHalf">): Array<{ dateISO: string; half: HalfDay }> {
  const endISO = a.endDateISO ?? a.dateISO;
  const endHalf: HalfDay = a.endHalf ?? a.half;
  const out: Array<{ dateISO: string; half: HalfDay }> = [];
  const start = new Date(a.dateISO);
  const end = new Date(endISO);
  if (end < start) return [{ dateISO: a.dateISO, half: a.half }];
  const cursor = new Date(start);
  while (cursor <= end) {
    const wd = cursor.getDay();
    if (wd !== 0 && wd !== 6) {
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
    }
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
