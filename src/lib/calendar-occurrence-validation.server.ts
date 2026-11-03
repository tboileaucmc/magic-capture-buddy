import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assignment } from "./planning-types";
import type { CalendarOccurrence } from "./calendar-occurrence.server";
import { assertCanEditMission } from "./roles.server";
import { assignmentOccursOn } from "./planning-recurrence";

export async function assertCalendarOccurrence(supabase: SupabaseClient, userId: string, id: string, occurrence: CalendarOccurrence) {
  await assertCanEditMission(supabase, userId, { missionId: occurrence.seriesId });
  const { data: row, error } = await supabase.from("planning_state").select("data").eq("id", "main").maybeSingle();
  if (error) throw new Error(error.message);
  const planning = row?.data as unknown as { assignments?: Assignment[] };
  const series = planning?.assignments?.find((a) => a.id === occurrence.seriesId);
  const exception = planning?.assignments?.find((a) => a.id === id && a.seriesId === series?.id && a.originalDateISO === occurrence.dateISO && a.originalStartTime === occurrence.startTime);
  if (!series || series.recurrence !== "weekly" || id !== `${series.id}--${occurrence.dateISO}` ||
    (!exception && (occurrence.startTime !== series.startTime || !assignmentOccursOn(series, occurrence.dateISO, series.half)))) {
    throw new Error("Cette réunion ne correspond pas à la série sélectionnée");
  }
}