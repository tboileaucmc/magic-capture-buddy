import type { Assignment } from "./planning-types";

/** A second write persists series, new Meet URLs or clears a confirmed retry marker. */
export function calendarNeedsPlanningWrite(assignment: Assignment, meetUrl: string | undefined): boolean {
  return Boolean(assignment.seriesId || assignment.calendarPending || (meetUrl && meetUrl !== assignment.meetUrl));
}