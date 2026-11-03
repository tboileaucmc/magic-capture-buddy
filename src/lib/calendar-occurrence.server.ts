import { missionEventId } from "./calendar-cancellation.server";

export type CalendarOccurrence = { seriesId: string; dateISO: string; startTime: string };
const BASE = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events";

/** Resolve by original Paris wall time, not the edited/moved start time. */
export async function calendarOccurrenceId(occurrence: CalendarOccurrence, headers: Record<string, string>, request: typeof fetch = fetch) {
  const offsetPart = new Intl.DateTimeFormat("en", { timeZone: "Europe/Paris", timeZoneName: "longOffset" }).formatToParts(new Date(`${occurrence.dateISO}T12:00:00Z`)).find((p) => p.type === "timeZoneName")?.value;
  const offset = offsetPart?.replace("GMT", "") || "+00:00";
  const query = new URLSearchParams({ originalStart: `${occurrence.dateISO}T${occurrence.startTime}:00${offset}`, maxResults: "250", showDeleted: "false" });
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (;;) {
    const res = await request(`${BASE}/${missionEventId(occurrence.seriesId)}/instances?${query}`, { headers });
    if (!res.ok) throw new Error(`Recherche réunion échouée [${res.status}]: ${await res.text()}`);
    const page = await res.json() as { items?: Array<{ id: string; recurringEventId?: string; originalStartTime?: { dateTime?: string } }>; nextPageToken?: string };
    for (const item of page.items ?? []) {
      if (item.recurringEventId !== missionEventId(occurrence.seriesId) || !item.originalStartTime?.dateTime) continue;
      const parts = formatter.formatToParts(new Date(item.originalStartTime.dateTime));
      const get = (type: string) => parts.find((p) => p.type === type)?.value;
      if (`${get("year")}-${get("month")}-${get("day")}` === occurrence.dateISO && `${get("hour")}:${get("minute")}` === occurrence.startTime) return item.id;
    }
    if (!page.nextPageToken) break;
    query.set("pageToken", page.nextPageToken);
  }
  throw new Error("Réunion introuvable dans Google Agenda : modification non enregistrée");
}