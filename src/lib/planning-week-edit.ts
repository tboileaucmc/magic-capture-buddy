import { assignmentSlots, type Assignment } from "./planning-types";
import { planningValuesEqual } from "./planning-delta";

export function missionDates(a: Assignment): string[] {
  return [...new Set(assignmentSlots(a).map((slot) => slot.dateISO))];
}

/** Split a finite mission by technician/date; each selected day becomes independent. */
export function splitMissionDays(original: Assignment, technicianId: string, dates: string[], edited: Assignment, newId: () => string): Assignment[] {
  const allDates = missionDates(original);
  const selected = new Set(dates);
  if (original.recurrence || original.seriesId || !original.technicianIds.includes(technicianId) || !selected.size || dates.some((date) => !allDates.includes(date))) {
    throw new Error("Sélection de journées invalide");
  }
  const result: Assignment[] = [];
  const others = original.technicianIds.filter((id) => id !== technicianId);
  if (others.length) result.push({ ...original, technicianIds: others });
  const remaining = allDates.filter((date) => !selected.has(date));
  const groups: string[][] = [];
  for (const date of remaining) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    if (group && previous && Date.parse(`${date}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`) === 86400000) group.push(date);
    else groups.push([date]);
  }
  for (const group of groups) {
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) continue;
    result.push({ ...original, technicianIds: [technicianId], dateISO: first, half: first === original.dateISO ? original.half : "AM", endDateISO: last,
      endHalf: last === (original.endDateISO ?? original.dateISO) ? original.endHalf ?? original.half : "PM" });
  }
  for (const date of allDates.filter((day) => selected.has(day))) {
    result.push({ ...edited, technicianIds: [technicianId], dateISO: date, endDateISO: date, recurrence: undefined, seriesId: undefined,
      originalDateISO: undefined, originalStartTime: undefined, excludedDates: undefined });
  }
  return result.map((a, index) => ({ ...a, id: index === 0 ? original.id : newId(), sequence: index === 0 ? (original.sequence ?? 0) + 1 : 0 }));
}

export function replaceSplitMission(assignments: Assignment[], original: Assignment, replacements: Assignment[]): Assignment[] {
  const current = assignments.find((a) => a.id === original.id);
  if (!planningValuesEqual(current, original)) throw new Error("Cette mission a changé : rouvrez-la avant de modifier ses journées");
  return [...assignments.filter((a) => a.id !== original.id), ...replacements];
}

/** Remove entire selected dates for one technician, preserving every other occupied slot. */
export function deleteMissionDays(original: Assignment, technicianId: string, dates: string[], newId: () => string): Assignment[] {
  const allDates = missionDates(original);
  const selected = new Set(dates);
  if (original.recurrence || original.seriesId || !original.technicianIds.includes(technicianId) || !selected.size || dates.some((date) => !allDates.includes(date))) {
    throw new Error("Sélection de journées invalide");
  }
  const result: Assignment[] = [];
  const others = original.technicianIds.filter((id) => id !== technicianId);
  if (others.length) result.push({ ...original, technicianIds: others });
  const groups: string[][] = [];
  for (const date of allDates.filter((day) => !selected.has(day))) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    if (group && previous && Date.parse(`${date}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`) === 86400000) group.push(date);
    else groups.push([date]);
  }
  const slots = assignmentSlots(original);
  for (const group of groups) {
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) continue;
    const half = slots.find((slot) => slot.dateISO === first)?.half ?? original.half;
    const endHalf = slots.filter((slot) => slot.dateISO === last).at(-1)?.half ?? original.half;
    result.push({ ...original, technicianIds: [technicianId], dateISO: first, endDateISO: last, half, endHalf,
      startTime: first === original.dateISO ? original.startTime : "08:00",
      endTime: last === (original.endDateISO ?? original.dateISO) ? original.endTime : "18:00" });
  }
  return result.map((mission, index) => ({ ...mission, id: index === 0 ? original.id : newId(), sequence: index === 0 ? (original.sequence ?? 0) + 1 : 0 }));
}

/** An agenda failure must leave the shared mission intact and the dialog retryable. */
export async function persistDeletedMissionDays(original: Assignment, replacements: Assignment[], operations: {
  update: (mission: Assignment) => Promise<void>;
  cancel: (original: Assignment) => Promise<void>;
  replace: (original: Assignment, replacements: Assignment[]) => Promise<void>;
}): Promise<void> {
  if (!replacements.length) await operations.cancel(original);
  else for (const mission of replacements) await operations.update(mission);
  await operations.replace(original, replacements);
}