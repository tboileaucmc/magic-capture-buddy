import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const schema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  location: z.string().max(1000),
  description: z.string().max(8000),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  attendees: z.array(z.string().email()).max(50),
});

/** Identifiant Google stable dérivé de l'id de mission (caractères 0-9a-f autorisés). */
function eventId(id: string) {
  return "m" + Array.from(new TextEncoder().encode(id)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Crée ou remplace l'événement dans l'agenda planning.cinemeccanica@gmail.com et invite les techniciens. */
export const sendMissionToCalendar = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const calKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!lovableKey || !calKey) throw new Error("Agenda Google non connecté");
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": calKey,
      "Content-Type": "application/json",
    };
    const id = eventId(data.id);
    const body = {
      id,
      summary: data.title,
      location: data.location,
      description: data.description,
      start: { dateTime: `${data.start}:00`, timeZone: "Europe/Paris" },
      end: { dateTime: `${data.end}:00`, timeZone: "Europe/Paris" },
      attendees: data.attendees.map((email) => ({ email })),
      status: "confirmed",
    };
    const base = `${GATEWAY_URL}/calendars/primary/events`;
    let res = await fetch(`${base}/${id}?sendUpdates=all`, { method: "PUT", headers, body: JSON.stringify(body) });
    if (res.status === 404) {
      res = await fetch(`${base}?sendUpdates=all`, { method: "POST", headers, body: JSON.stringify(body) });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error(`Google Calendar [${res.status}]: ${t}`);
      throw new Error(`Envoi agenda échoué [${res.status}]: ${t.slice(0, 300)}`);
    }
    return { ok: true };
  });
