import { RRule } from "rrule";
import { assignmentSlots, type Assignment, type HalfDay } from "./planning-types";

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Calendar dates are treated as UTC-only values, not Paris timestamps. */
export function nextWeeklyDate(dateISO: string, weekday: number): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (weekday - date.getUTCDay() + 7) % 7);
  return date.toISOString().slice(0, 10);
}

export function weeklyRule(a: Pick<Assignment, "dateISO" | "recurrence">): string | undefined {
  if (a.recurrence !== "weekly") return undefined;
  const weekday = WEEKDAYS[new Date(`${a.dateISO}T00:00:00Z`).getUTCDay()];
  return weekday ? `RRULE:FREQ=WEEKLY;BYDAY=${weekday}` : undefined;
}

/** Resolve only the requested cell; never materialize an infinite series. */
export function assignmentOccursOn(a: Assignment, dateISO: string, half: HalfDay): boolean {
  const rule = weeklyRule(a);
  if (!rule) return assignmentSlots(a).some((s) => s.dateISO === dateISO && s.half === half);
  if (dateISO < a.dateISO || a.excludedDates?.includes(dateISO)) return false;
  const date = new Date(`${dateISO}T00:00:00Z`);
  const recurring = RRule.fromString(rule);
  const series = new RRule({ ...recurring.origOptions, dtstart: new Date(`${a.dateISO}T00:00:00Z`), byhour: 0, byminute: 0, bysecond: 0 });
  const occurrence = series.after(date, true);
  if (occurrence?.getTime() !== date.getTime()) return false;
  return half === a.half || (a.half === "AM" && a.endHalf === "PM");
}

/** Materialize only the selected meeting; retain its original Calendar identity. */
export function meetingOccurrence(series: Assignment, dateISO: string): Assignment {
  return {
    ...series,
    id: `${series.id}--${dateISO}`,
    dateISO,
    endDateISO: series.endDateISO ? dateISO : undefined,
    recurrence: undefined,
    excludedDates: undefined,
    seriesId: series.id,
    originalDateISO: dateISO,
    originalStartTime: series.startTime,
  };
}

/** Apply parent exclusion and exception together, avoiding duplicate cells/realtime saves. */
export function saveMeetingAssignment(assignments: Assignment[], edited: Assignment): Assignment[] {
  return [...assignments.filter((a) => a.id !== edited.id).map((a) =>
    a.id === edited.seriesId && edited.originalDateISO
      ? { ...a, excludedDates: [...new Set([...(a.excludedDates ?? []), edited.originalDateISO])] }
      : a,
  ), edited];
}