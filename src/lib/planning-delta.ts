import type { PlanningData } from "./planning-persistence";

type Item = { id: string; [key: string]: unknown };
type Changes = { add: Item[]; remove: string[]; update: Record<string, { set: Record<string, unknown>; unset: string[] }>; order?: string[] };
// Compare large attachment strings directly, without allocating serialized copies.
export function planningValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => planningValuesEqual(value, b[i]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter(key => left[key] !== undefined);
  return keys.length === Object.keys(right).filter(key => right[key] !== undefined).length
    && keys.every(key => planningValuesEqual(left[key], right[key]));
}
export function planningDelta(before: PlanningData, after: PlanningData): Record<string, Changes> {
  const patch: Record<string, Changes> = {};
  for (const section of ["assignments", "technicians", "categories"] as const) {
    const oldItems = before[section] as unknown as Item[];
    const newItems = after[section] as unknown as Item[];
    const oldMap = new Map(oldItems.map(item => [item.id, item]));
    const ids = new Set(newItems.map(item => item.id));
    const changes: Changes = { add: [], remove: oldItems.filter(item => !ids.has(item.id)).map(item => item.id), update: {} };
    for (const item of newItems) {
      const previous = oldMap.get(item.id);
      if (!previous) { changes.add.push(item); continue; }
      if (previous === item) continue;
      const set: Record<string, unknown> = {};
      const unset: string[] = [];
      for (const key of new Set([...Object.keys(previous), ...Object.keys(item)])) {
        if (key === "id" || previous[key] === item[key]) continue;
        if (planningValuesEqual(previous[key], item[key])) continue;
        if (item[key] === undefined) unset.push(key);
        else set[key] = item[key];
      }
      if (Object.keys(set).length || unset.length) changes.update[item.id] = { set, unset };
    }
    const defaultOrder = [...oldItems.filter(item => ids.has(item.id)), ...changes.add].map(item => item.id);
    if (defaultOrder.some((id, i) => id !== newItems[i]?.id)) changes.order = newItems.map(item => item.id);
    if (changes.add.length || changes.remove.length || Object.keys(changes.update).length || changes.order) patch[section] = changes;
  }
  return patch;
}