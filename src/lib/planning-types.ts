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
  dateISO: string; // yyyy-mm-dd
  half: HalfDay;
  categoryId: string;
  title: string; // chantier / mission
  address: string;
  startTime: string; // "08:00"
  endTime: string; // "12:00"
  notes?: string;
  link?: string;
  attachments?: Attachment[];
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "chantier", label: "Chantier", color: "#3b82f6" },
  { id: "maintenance", label: "Maintenance", color: "#10b981" },
  { id: "depannage", label: "Dépannage", color: "#ef4444" },
  { id: "conge", label: "Congé", color: "#f59e0b" },
  { id: "formation", label: "Formation", color: "#8b5cf6" },
  { id: "astreinte", label: "Astreinte", color: "#ec4899" },
];

export const DEFAULT_TECHNICIANS: Technician[] = [
  { id: "thomas", name: "Thomas", email: "tboileaucmc@gmail.com" },
];
