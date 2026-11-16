import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { persistPlanningMutation, planningMutationQueue, type PlanningData, type PlanningSnapshot } from "./planning-persistence";
import type { Json } from "@/integrations/supabase/types";
import { saveMeetingAssignment, deleteMeetingAssignment } from "./planning-recurrence";
import { replaceSplitMission } from "./planning-week-edit";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_TECHNICIANS,
  type Assignment,
  type Category,
  type Technician,
} from "./planning-types";

type Data = PlanningData;
const enqueueMutation = planningMutationQueue();

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

/** Reads never write fallback browser data over the team planning. */
async function loadRemote(): Promise<PlanningSnapshot> {
  const { data: row, error } = await supabase.from("planning_state").select("data, updated_at").eq("id", "main").single();
  if (error) throw error;
  const remote = row.data as Data | undefined;
  if (!remote || !Array.isArray(remote.assignments)) throw new Error("Planning partagé indisponible");
  return { data: migrate(remote), updatedAt: row.updated_at };
}

async function writeRemote(data: Data, previousVersion: string, nextVersion: string): Promise<PlanningSnapshot | null> {
  const { data: row, error } = await supabase.from("planning_state")
    .update({ data: data as unknown as Json, updated_at: nextVersion })
    .eq("id", "main").eq("updated_at", previousVersion)
    .select("data, updated_at").maybeSingle();
  if (error) throw error;
  return row ? { data: migrate(row.data as Data), updatedAt: row.updated_at } : null;
}

export function usePlanning() {
  const [data, setData] = useState<Data>({ technicians: DEFAULT_TECHNICIANS, categories: DEFAULT_CATEGORIES, assignments: [] });
  const [hydrated, setHydrated] = useState(false);
  const version = useRef("");
  const apply = useCallback((snapshot: PlanningSnapshot) => {
    // Ignore late initial reads and delayed realtime echoes of older saves.
    if (version.current && Date.parse(snapshot.updatedAt) < Date.parse(version.current)) return;
    version.current = snapshot.updatedAt;
    setData(snapshot.data);
    setHydrated(true);
  }, []);

  useEffect(() => {
    let active = true;
    void loadRemote().then((snapshot) => { if (active) apply(snapshot); })
      .catch(() => { if (active) toast.error("Chargement du planning impossible : actualisez la page."); });
    const channel = supabase.channel(`planning-state-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "planning_state" }, (payload) => {
        const row = payload.new as { data?: Data; updated_at?: string };
        if (active && row.data && Array.isArray(row.data.assignments) && row.updated_at) {
          apply({ data: migrate(row.data), updatedAt: row.updated_at });
        }
      }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [apply]);

  const mutate = useCallback((change: (current: Data) => Data) => {
    const result = enqueueMutation(async () => {
      const saved = await persistPlanningMutation({ read: loadRemote, write: writeRemote }, change);
      apply(saved);
    });
    // Report failures even for controls that do not await their mutation.
    void result.catch((error) => toast.error(`Modification non enregistrée : ${error instanceof Error ? error.message : "réessayez"}`));
    return result;
  }, [apply]);

  const upsertAssignment = useCallback((a: Assignment) => mutate((d) => ({ ...d, assignments: saveMeetingAssignment(d.assignments, a) })), [mutate]);
  const deleteAssignment = useCallback((target: Assignment) => mutate((d) => ({ ...d, assignments: deleteMeetingAssignment(d.assignments, target) })), [mutate]);
  const addTechnician = useCallback((t: Technician) => mutate((d) => ({ ...d, technicians: [...d.technicians, t] })), [mutate]);
  const updateTechnician = useCallback((t: Technician) => mutate((d) => ({ ...d, technicians: d.technicians.map((x) => x.id === t.id ? t : x) })), [mutate]);
  const removeTechnician = useCallback((id: string) => mutate((d) => ({ ...d,
    technicians: d.technicians.filter((t) => t.id !== id),
    assignments: d.assignments.map((a) => ({ ...a, technicianIds: a.technicianIds.filter((t) => t !== id) })).filter((a) => a.technicianIds.length > 0),
  })), [mutate]);
  const removeCategory = useCallback((id: string) => mutate((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id), assignments: d.assignments.filter((a) => a.categoryId !== id) })), [mutate]);
  const addCategory = useCallback((c: Category) => mutate((d) => ({ ...d, categories: [...d.categories, c] })), [mutate]);
  const updateCategoryColor = useCallback((id: string, color: string) => mutate((d) => ({ ...d, categories: d.categories.map((c) => c.id === id ? { ...c, color } : c) })), [mutate]);
  const addAssignments = useCallback((list: Assignment[]) => mutate((d) => ({ ...d, assignments: [...d.assignments, ...list] })), [mutate]);
  const replaceAssignmentDays = useCallback((original: Assignment, replacements: Assignment[]) => mutate((d) => ({ ...d, assignments: replaceSplitMission(d.assignments, original, replacements) })), [mutate]);

  return { data, hydrated, upsertAssignment, deleteAssignment, addTechnician, updateTechnician, removeTechnician, addCategory, removeCategory, updateCategoryColor, addAssignments, replaceAssignmentDays };
}
