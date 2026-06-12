import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_TECHNICIANS,
  assignmentSlots,
  type Assignment,
  type Category,
  type Technician,
} from "./planning-types";

const KEY = "planning-data-v1";

type Data = {
  technicians: Technician[];
  categories: Category[];
  assignments: Assignment[];
};

function load(): Data {
  if (typeof window === "undefined") {
    return { technicians: DEFAULT_TECHNICIANS, categories: DEFAULT_CATEGORIES, assignments: [] };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { technicians: DEFAULT_TECHNICIANS, categories: DEFAULT_CATEGORIES, assignments: [] };
    const parsed = JSON.parse(raw) as Data;
    // Migration: rename old "Chantier" label to "Affaires"
    parsed.categories = parsed.categories.map((c) =>
      c.id === "chantier" ? { ...c, label: "Affaires" } : c,
    );
    // Migration: technicianId (string) → technicianIds (string[])
    parsed.assignments = parsed.assignments.map((a) => {
      const legacy = a as Assignment & { technicianId?: string };
      if (!legacy.technicianIds && legacy.technicianId) {
        return { ...legacy, technicianIds: [legacy.technicianId] };
      }
      return { ...legacy, technicianIds: legacy.technicianIds ?? [] };
    });
    return parsed;
  } catch {
    return { technicians: DEFAULT_TECHNICIANS, categories: DEFAULT_CATEGORIES, assignments: [] };
  }
}

function save(data: Data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function usePlanning() {
  const [data, setData] = useState<Data>({
    technicians: DEFAULT_TECHNICIANS,
    categories: DEFAULT_CATEGORIES,
    assignments: [],
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(data);
  }, [data, hydrated]);

  const upsertAssignment = useCallback((a: Assignment) => {
    setData((d) => {
      const slots = assignmentSlots(a);
      const others = d.assignments.filter((x) => {
        if (x.id === a.id) return false;
        const shareTech = x.technicianIds.some((t) => a.technicianIds.includes(t));
        if (!shareTech) return true;
        const xSlots = assignmentSlots(x);
        return !xSlots.some((xs) =>
          slots.some((s) => s.dateISO === xs.dateISO && s.half === xs.half),
        );
      });
      return { ...d, assignments: [...others, a] };
    });
  }, []);

  const deleteAssignment = useCallback((id: string) => {
    setData((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) }));
  }, []);

  const addTechnician = useCallback((t: Technician) => {
    setData((d) => ({ ...d, technicians: [...d.technicians, t] }));
  }, []);

  const removeTechnician = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      technicians: d.technicians.filter((t) => t.id !== id),
      assignments: d.assignments.filter((a) => a.technicianId !== id),
    }));
  }, []);

  const addCategory = useCallback((c: Category) => {
    setData((d) => ({ ...d, categories: [...d.categories, c] }));
  }, []);

  return { data, upsertAssignment, deleteAssignment, addTechnician, removeTechnician, addCategory };
}
