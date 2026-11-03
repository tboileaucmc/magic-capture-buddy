/** Keep the same identifier for creation, updates and cancellation. */
export function missionEventId(id: string) {
  return "m" + Array.from(new TextEncoder().encode(id)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function cancelCalendarMission(id: string, lovableKey: string, calendarKey: string, request: typeof fetch = fetch) {
  const eventUrl = `https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events/${missionEventId(id)}`;
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": calendarKey };
  // Remove the app's reminder before cancellation, without an extra invitation email.
  const cleared = await request(`${eventUrl}?sendUpdates=none`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ reminders: { useDefault: false, overrides: [] } }),
  });
  if (cleared.status === 404 || cleared.status === 410) return;
  if (!cleared.ok) {
    throw new Error(`Suppression du rappel échouée [${cleared.status}] : la mission est conservée pour réessayer`);
  }
  const response = await request(
    `${eventUrl}?sendUpdates=all`,
    { method: "DELETE", headers },
  );
  // A missing or previously cancelled event is already in the desired state.
  if (response.ok || response.status === 404 || response.status === 410) return;
  const body = await response.text();
  console.error(`Google Calendar cancellation [${response.status}]: ${body}`);
  throw new Error(`Annulation agenda échouée [${response.status}]: ${body}`);
}