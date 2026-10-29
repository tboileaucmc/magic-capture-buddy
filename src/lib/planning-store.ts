import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
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

  // Mise à jour en direct : applique les changements faits par les autres utilisateurs.
  useEffect(() => {
    const channel = supabase
      .channel(`planning-state-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "planning_state" },
        (payload) => {
          const remote = (payload.new as { data?: Data } | null)?.data;
          if (!remote || !Array.isArray(remote.assignments)) return;
          skipNext.current = true;
          setData(migrate(remote));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNext.current) { skipNext.current = false; return; }
    const t = setTimeout(() => void saveRemote(data), 400);
    return () => clearTimeout(t);
  }, [data, hydrated]);

  const upsertAssignment = useCallback((a: Assignment) => {
    // Plusieurs missions peuvent partager le même créneau (cas exceptionnel) :
    // on ne remplace que la mission de même identifiant.
    setData((d) => ({
      ...d,
      assignments: [...d.assignments.filter((x) => x.id !== a.id), a],
    }));
  }, []);

  const deleteAssignment = useCallback((id: string) => {
    setData((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) }));
  }, []);

  const addTechnician = useCallback((t: Technician) => {
    setData((d) => ({ ...d, technicians: [...d.technicians, t] }));
  }, []);

  const updateTechnician = useCallback((t: Technician) => {
    setData((d) => ({ ...d, technicians: d.technicians.map((x) => (x.id === t.id ? t : x)) }));
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

  return { data, hydrated, upsertAssignment, deleteAssignment, addTechnician, updateTechnician, removeTechnician, addCategory, removeCategory };
}
