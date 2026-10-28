/** Keep the same identifier for creation, updates and cancellation. */
export function missionEventId(id: string) {
  return "m" + Array.from(new TextEncoder().encode(id)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function cancelCalendarMission(id: string, lovableKey: string, calendarKey: string, request: typeof fetch = fetch) {
  const response = await request(
    `https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events/${missionEventId(id)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": calendarKey } },
  );
  // A missing or previously cancelled event is already in the desired state.
  if (response.ok || response.status === 404 || response.status === 410) return;
  const body = await response.text();
  console.error(`Google Calendar cancellation [${response.status}]: ${body}`);
  throw new Error(`Annulation agenda échouée [${response.status}]: ${body}`);
}