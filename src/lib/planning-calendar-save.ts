import type { Assignment } from "./planning-types";

/** A confirmed ordinary save only needs a second write when Calendar adds a new Meet URL. */
export function calendarNeedsPlanningWrite(assignment: Assignment, meetUrl: string | undefined): boolean {
  return Boolean(assignment.seriesId || (meetUrl && meetUrl !== assignment.meetUrl));
}