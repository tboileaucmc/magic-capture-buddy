import { assignmentSlots, type Assignment } from "./planning-types";

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
  if (JSON.stringify(current) !== JSON.stringify(original)) throw new Error("Cette mission a changé : rouvrez-la avant de modifier ses journées");
  return [...assignments.filter((a) => a.id !== original.id), ...replacements];
}