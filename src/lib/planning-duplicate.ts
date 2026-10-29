import type { Assignment } from "./planning-types";

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Copies the missions starting in the 7-day week beginning at `sourceMondayISO`
 * to the week beginning at `targetMondayISO`. Weekly series are skipped (they
 * already repeat). `canCopy` filters missions the user may write.
 */
export function duplicateWeek(
  assignments: Assignment[],
  sourceMondayISO: string,
  targetMondayISO: string,
  canCopy: (a: Assignment) => boolean,
  newId: () => string,
): Assignment[] {
  const sourceEnd = shiftISO(sourceMondayISO, 6);
  const [sy, sm, sd] = sourceMondayISO.split("-").map(Number);
  const [ty, tm, td] = targetMondayISO.split("-").map(Number);
  const offset = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(sy, sm - 1, sd)) / 86400000);
  return assignments
    .filter((a) => !a.recurrence && a.dateISO >= sourceMondayISO && a.dateISO <= sourceEnd && canCopy(a))
    .map((a) => {
      const copy: Assignment = {
        ...a,
        id: newId(),
        dateISO: shiftISO(a.dateISO, offset),
        endDateISO: a.endDateISO ? shiftISO(a.endDateISO, offset) : undefined,
        sequence: undefined,
        meetUrl: undefined,
      };
      return copy;
    });
}
