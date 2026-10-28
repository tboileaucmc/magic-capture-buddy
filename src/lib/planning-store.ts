import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
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

function migrate(parsed: Data): Data {
  try {
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

/** Ancien stockage navigateur : sert uniquement à transférer les données au premier passage en ligne. */
function loadLocal(): Data | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw) as Data) : null;
  } catch {
    return null;
  }
}

/** Charge le planning partagé en ligne (ligne unique « main »). */
async function loadRemote(): Promise<Data> {
  const { data: row, error } = await supabase.from("planning_state").select("data").eq("id", "main").maybeSingle();
  if (error) throw error;
  const remote = row?.data as Data | undefined;
  if (remote && Array.isArray(remote.assignments)) return migrate(remote);
  const initial = loadLocal() ?? { technicians: DEFAULT_TECHNICIANS, categories: DEFAULT_CATEGORIES, assignments: [] };
  await supabase.from("planning_state").upsert({ id: "main", data: initial as unknown as Json });
  return initial;
}

async function saveRemote(data: Data) {
  const { error } = await supabase
    .from("planning_state")
    .update({ data: data as unknown as Json, updated_at: new Date().toISOString() })
    .eq("id", "main");
  if (error) console.error("Enregistrement en ligne échoué", error);
}

export function usePlanning() {
  const [data, setData] = useState<Data>({
    technicians: DEFAULT_TECHNICIANS,
    categories: DEFAULT_CATEGORIES,
    assignments: [],
  });
  const [hydrated, setHydrated] = useState(false);

  const skipNext = useRef(true);

  useEffect(() => {
    loadRemote()
      .then((d) => { skipNext.current = true; setData(d); setHydrated(true); })
      .catch((e) => console.error("Chargement du planning échoué", e));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNext.current) { skipNext.current = false; return; }
    const t = setTimeout(() => void saveRemote(data), 400);
    return () => clearTimeout(t);
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
      assignments: d.assignments
        .map((a) => ({ ...a, technicianIds: a.technicianIds.filter((t) => t !== id) }))
        .filter((a) => a.technicianIds.length > 0),
    }));
  }, []);

  const removeCategory = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      assignments: d.assignments.filter((a) => a.categoryId !== id),
    }));
  }, []);

  const addCategory = useCallback((c: Category) => {
    setData((d) => ({ ...d, categories: [...d.categories, c] }));
  }, []);

  return { data, hydrated, upsertAssignment, deleteAssignment, addTechnician, removeTechnician, addCategory, removeCategory };
}
