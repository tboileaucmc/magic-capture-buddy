import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_TECHNICIANS,
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
    return parsed;
  } catch {
    return { technicians: DEFAULT_TECHNICIANS, categories: DEFAULT_CATEGORIES, assignments: [] };
  }
}

function save(data: Data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function usePlanning() {
  const [data, setData] = useState<Data>(() => load());

  useEffect(() => {
    save(data);
  }, [data]);

  const upsertAssignment = useCallback((a: Assignment) => {
    setData((d) => {
      const others = d.assignments.filter(
        (x) =>
          !(x.technicianId === a.technicianId && x.dateISO === a.dateISO && x.half === a.half) &&
          x.id !== a.id,
      );
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
