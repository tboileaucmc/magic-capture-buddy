import type { PlanningData } from "./planning-persistence";

type Item = { id: string; [key: string]: unknown };
type Changes = { add: Item[]; remove: string[]; update: Record<string, { set: Record<string, unknown>; unset: string[] }>; order?: string[] };
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
        if (JSON.stringify(previous[key]) === JSON.stringify(item[key])) continue;
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