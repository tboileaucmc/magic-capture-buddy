import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const schema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  location: z.string().max(1000),
  description: z.string().max(8000),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  attendees: z.array(z.string().email()).max(50),
  occurrence: z.object({
    seriesId: z.string().min(1).max(200),
    dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
  recurrence: z.array(z.string().regex(/^RRULE:FREQ=WEEKLY;BYDAY=(SU|MO|TU|WE|TH|FR|SA)$/)).max(1).default([]),
  meet: z.boolean().default(false),
  reminder15: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        name: z.string().max(300),
        type: z.enum(["image/jpeg", "image/png", "application/pdf", "message/rfc822", "application/vnd.ms-outlook"]),
        // 20 Mo maximum par fichier (encodage base64 ≈ 4/3 + en-tête).
        dataUrl: z.string().max(Math.ceil((20 * 1024 * 1024 * 4) / 3) + 200, "Fichier trop volumineux (20 Mo maximum)"),
      }),
    )
    .max(10)
    .default([]),
});

const DRIVE = "https://connector-gateway.lovable.dev/google_drive";

/** Dépose le fichier dans le Drive du compte planning, le rend lisible par lien, renvoie l'URL. */
export async function uploadToDrive(f: { name: string; type: string; dataUrl: string }, lovableKey: string, driveKey: string) {
  const b64 = f.dataUrl.split(",")[1] ?? "";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const boundary = "mission" + Date.now();
  // Marqueur permettant à la purge trimestrielle de ne toucher qu'aux pièces jointes du planning.
  const meta = JSON.stringify({ name: f.name, mimeType: f.type, appProperties: { planningAttachment: "1" } });
  const enc = new TextEncoder();
  const body = new Blob([
    enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${f.type}\r\n\r\n`),
    bytes,
    enc.encode(`\r\n--${boundary}--`),
  ]);
  const auth = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey };
  const up = await fetch(`${DRIVE}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,mimeType`, {
    method: "POST",
    headers: { ...auth, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!up.ok) throw new Error(`Drive [${up.status}]: ${(await up.text()).slice(0, 300)}`);
  const file = (await up.json()) as { id: string; webViewLink: string; mimeType: string };
  const perm = await fetch(`${DRIVE}/drive/v3/files/${file.id}/permissions`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!perm.ok) console.error(`Drive permission [${perm.status}]: ${await perm.text()}`);
  return { fileUrl: file.webViewLink, title: f.name, mimeType: file.mimeType };
}

/** Identifiant Google stable dérivé de l'id de mission (caractères 0-9a-f autorisés). */
export const cancelMissionInCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertCanEditMission } = await import("./roles.server");
    await assertCanEditMission(context.supabase, context.userId, { missionId: data.id });
    const lovableKey = process.env.LOVABLE_API_KEY;
    const calendarKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!lovableKey || !calendarKey) throw new Error("Agenda Google non connecté : la mission est conservée");
    const { cancelCalendarMission } = await import("./calendar-cancellation.server");
    await cancelCalendarMission(data.id, lovableKey, calendarKey);
    return { ok: true };
  });

/** Crée ou remplace l'événement dans l'agenda planning.cinemeccanica@gmail.com et invite les techniciens. */
export const sendMissionToCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertCanEditMission } = await import("./roles.server");
    await assertCanEditMission(context.supabase, context.userId, { attendees: data.attendees, missionId: data.id });
    if (data.occurrence) {
      await assertCanEditMission(context.supabase, context.userId, { missionId: data.occurrence.seriesId });
      const { data: row, error } = await context.supabase.from("planning_state").select("data").eq("id", "main").maybeSingle();
      if (error) throw new Error(error.message);
      const planning = row?.data as unknown as { assignments?: import("./planning-types").Assignment[] };
      const series = planning?.assignments?.find((a) => a.id === data.occurrence?.seriesId);
      const { assignmentOccursOn } = await import("./planning-recurrence");
      if (!series || series.recurrence !== "weekly" || data.id !== `${series.id}--${data.occurrence.dateISO}` ||
        (!assignmentOccursOn({ ...series, excludedDates: [] }, data.occurrence.dateISO, series.half) && !planning?.assignments?.some((a) => a.id === data.id && a.seriesId === series.id && a.originalDateISO === data.occurrence?.dateISO && a.originalStartTime === data.occurrence?.startTime))) {
        throw new Error("Cette réunion ne correspond pas à la série sélectionnée");
      }
    }
    const lovableKey = process.env.LOVABLE_API_KEY;
    const calKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!lovableKey || !calKey) throw new Error("Agenda Google non connecté");
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": calKey,
      "Content-Type": "application/json",
    };
    const { missionEventId } = await import("./calendar-cancellation.server");
    const { calendarOccurrenceId } = await import("./calendar-occurrence.server");
    const id = data.occurrence ? await calendarOccurrenceId(data.occurrence, headers) : missionEventId(data.id);
    const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
    const attachments = [];
    if (driveKey) {
      for (const f of data.attachments) attachments.push(await uploadToDrive(f, lovableKey, driveKey));
    }
    const body = {
      ...(!data.occurrence ? { id } : {}),
      summary: data.title,
      location: data.location,
      description: data.description,
      start: { dateTime: `${data.start}:00`, timeZone: "Europe/Paris" },
      end: { dateTime: `${data.end}:00`, timeZone: "Europe/Paris" },
      attendees: data.attendees.map((email) => ({ email })),
      ...(!data.occurrence ? { recurrence: data.recurrence } : {}),
      status: "confirmed",
      colorId: "7",
      transparency: "transparent",
      reminders: { useDefault: false, overrides: data.reminder15 ? [{ method: "popup", minutes: 15 }] : [] },
      attachments,
      ...(data.meet
        ? { conferenceData: { createRequest: { requestId: `meet-${id}`, conferenceSolutionKey: { type: "hangoutsMeet" } } } }
        : {}),
    };
    const base = `${GATEWAY_URL}/calendars/primary/events`;
    let res = await fetch(`${base}/${id}?sendUpdates=all&supportsAttachments=true&conferenceDataVersion=1`, { method: "PATCH", headers, body: JSON.stringify(body) });
    if (res.status === 404 && !data.occurrence) {
      res = await fetch(`${base}?sendUpdates=all&supportsAttachments=true&conferenceDataVersion=1`, { method: "POST", headers, body: JSON.stringify(body) });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error(`Google Calendar [${res.status}]: ${t}`);
      throw new Error(`Envoi agenda échoué [${res.status}]: ${t.slice(0, 300)}`);
    }
    const ev = (await res.json()) as { hangoutLink?: string };
    return { ok: true, meetUrl: data.meet ? ev.hangoutLink : undefined };
  });
