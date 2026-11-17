import type { Assignment, Category } from "./planning-types";
import { calendarNeedsPlanningWrite } from "./planning-calendar-save";

/** Category IDs are editable/generated, so resolve the travel rule by its label. */
export function missionNeedsCalendar(mission: Pick<Assignment, "categoryId">, categories: Pick<Category, "id" | "label">[]): boolean {
  return categories.find((category) => category.id === mission.categoryId)?.label.trim().toLocaleLowerCase("fr-FR") !== "trajet";
}

/** Keep provider refusal distinct from planning/auth failures across server serialization. */
export type CalendarSendResult = { ok: true; meetUrl?: string } | { ok: false; status: 403; error: string };

export class CalendarForbiddenError extends Error {
  constructor(message: string) { super(message); this.name = "CalendarForbiddenError"; }
}

export function acceptedCalendarResult(result: CalendarSendResult): { ok: true; meetUrl?: string } {
  if (!result.ok) throw new CalendarForbiddenError(result.error);
  return result;
}

/** A retry keeps its marker until both provider acceptance and persistence succeed. */
export async function saveCalendarMission(
  mission: Assignment,
  save: (mission: Assignment, close?: boolean) => Promise<void>,
  send: () => Promise<CalendarSendResult>,
  close: () => void,
  outcome: { saved: boolean; sent: boolean },
  categories: Pick<Category, "id" | "label">[] = [],
) {
  if (!missionNeedsCalendar(mission, categories)) {
    await save({ ...mission, calendarPending: undefined }, false);
    outcome.saved = true;
    close();
    return;
  }
  if (!mission.seriesId) { await save(mission, false); outcome.saved = true; }
  let result: { ok: true; meetUrl?: string };
  try { result = acceptedCalendarResult(await send()); }
  catch (error) {
    if (error instanceof CalendarForbiddenError) {
      await save({ ...mission, calendarPending: true }, false);
      outcome.saved = true;
    }
    throw error;
  }
  outcome.sent = true;
  if (calendarNeedsPlanningWrite(mission, result.meetUrl)) {
    await save({ ...mission, calendarPending: undefined, meetUrl: result.meetUrl ?? mission.meetUrl });
  } else { close(); }
}