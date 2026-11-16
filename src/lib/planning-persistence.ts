import type { Assignment, Category, Technician } from "./planning-types";

export type PlanningData = { technicians: Technician[]; categories: Category[]; assignments: Assignment[] };
export type PlanningSnapshot = { data: PlanningData; updatedAt: string };
export type PlanningPersistence = {
  read: () => Promise<PlanningSnapshot>;
  write: (data: PlanningData, previousVersion: string, nextVersion: string) => Promise<PlanningSnapshot | null>;
};

/** Replay a focused mutation against the latest shared row, never a stale screen snapshot. */
export async function persistPlanningMutation(storage: PlanningPersistence, mutate: (data: PlanningData) => PlanningData): Promise<PlanningSnapshot> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await storage.read();
    const next = mutate(current.data);
    const version = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString();
    const saved = await storage.write(next, current.updatedAt, version);
    if (saved) return saved;
  }
  throw new Error("Le planning est modifié simultanément : réessayez. Votre modification n’a pas été enregistrée.");
}

/** Failed writes must not prevent the next operation from running. */
export function planningMutationQueue() {
  let pending: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  };
}