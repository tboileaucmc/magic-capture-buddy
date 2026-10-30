import type { Assignment, Technician } from "./planning-types";
import { weeklyRule } from "./planning-recurrence";
import { wazeInvitationUrl } from "./waze";

/** Accepte uniquement les liens HTTPS des services de réunion Microsoft Teams. */
export function normalizeTeamsUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    if (!["teams.microsoft.com", "teams.live.com", "teams.cloud.microsoft"].includes(url.hostname)) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function fmtICS(date: Date): string {
  // YYYYMMDDTHHMMSS (local, floating)
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    p(date.getMonth() + 1) +
    p(date.getDate()) +
    "T" +
    p(date.getHours()) +
    p(date.getMinutes()) +
    "00"
  );
}

function toDate(dateISO: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(dateISO);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function startDate(a: Assignment): Date {
  return toDate(a.dateISO, a.startTime);
}
function endDate(a: Assignment): Date {
  return toDate(a.endDateISO ?? a.dateISO, a.endTime);
}

/** Si « A confirmer », masque les informations précises mais garde l'intitulé + « à confirmer ». */
export function maskIfToConfirm(a: Assignment): Assignment {
  if (!a.toConfirm) return a;
  return {
    ...a,
    title: `${a.title} (à confirmer)`,
    address: "",
    notes: "Un rendez-vous est prévu sur ce créneau. Les détails vous seront communiqués après confirmation.",
    link: undefined,
    teamsUrl: undefined,
    attachments: [],
  };
}

export function buildDescription(input: Assignment): string {
  const a = maskIfToConfirm(input);
  const lines: string[] = [];
  if (a.address) {
    lines.push(`Adresse: ${a.address}`);
    lines.push(`Waze: ${wazeInvitationUrl(a.address)}`);
  }
  if (a.notes) lines.push("", a.notes);
  if (a.link) lines.push("", `Lien: ${a.link}`);
  const teamsUrl = a.teamsUrl ? normalizeTeamsUrl(a.teamsUrl) : undefined;
  if (teamsUrl) lines.push("", `Réunion Teams : ${teamsUrl}`);
  if (a.attachments?.length) {
    lines.push("", "Pièces jointes:");
    a.attachments.forEach((f) => lines.push(`- ${f.name}`));
  }
  return lines.join("\n");
}

export function buildICS(input: Assignment, techs: Technician[]): string {
  const a = maskIfToConfirm(input);
  const start = startDate(a);
  const end = endDate(a);
  const uid = `${a.id}@planning.local`;
  const desc = buildDescription(a).replace(/\n/g, "\\n");
  const attendees = techs.map(
    (t) => `ATTENDEE;CN=${t.name};RSVP=TRUE:mailto:${t.email}`,
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Planning Techniciens//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    ...(a.recurrence ? [
      "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
      "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "DTSTART:19701025T030000", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
      "END:VTIMEZONE",
    ] : []),
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SEQUENCE:${a.sequence ?? 0}`,
    `DTSTAMP:${fmtICS(new Date())}`,
    `DTSTART${a.recurrence ? ";TZID=Europe/Paris" : ""}:${fmtICS(start)}`,
    `DTEND${a.recurrence ? ";TZID=Europe/Paris" : ""}:${fmtICS(end)}`,
    ...(weeklyRule(a) ? [weeklyRule(a)] : []),
    `SUMMARY:${a.title}`,
    `LOCATION:${a.address}`,
    `DESCRIPTION:${desc}`,
    `ORGANIZER;CN=Planning Cinemeccanica:mailto:planning.cinemeccanica@gmail.com`,
    ...attendees,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(input: Assignment, techs: Technician[]) {
  const ics = buildICS(input, techs);
  const a = maskIfToConfirm(input);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${a.title.replace(/[^a-z0-9]+/gi, "_")}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(input: Assignment, techs: Technician[]): string {
  const a = maskIfToConfirm(input);
  const start = startDate(a);
  const end = endDate(a);
  const fmt = (d: Date) => fmtICS(d);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: a.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: buildDescription(a),
    location: a.address,
  });
  for (const t of techs) params.append("add", t.email);
  const recurrence = weeklyRule(a);
  if (recurrence) { params.set("recur", recurrence); params.set("ctz", "Europe/Paris"); }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function mailtoUrl(input: Assignment, techs: Technician[]): string {
  const a = maskIfToConfirm(input);
  const subject = `Mission: ${a.title} — ${a.dateISO} ${a.half}`;
  const body = buildDescription(a);
  const to = techs.map((t) => t.email).join(",");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function fmtISOUtcLike(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export function outlookCalendarUrl(
  input: Assignment,
  techs: Technician[],
  account: "work" | "personal" = "work",
): string {
  const a = maskIfToConfirm(input);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: a.title,
    startdt: fmtISOUtcLike(startDate(a)),
    enddt: fmtISOUtcLike(endDate(a)),
    body: buildDescription(a),
    location: a.address,
  });
  const to = techs.map((t) => t.email).filter(Boolean).join(",");
  if (to) params.set("to", to);
  const host = account === "personal" ? "outlook.live.com" : "outlook.office.com";
  return `https://${host}/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Données à envoyer à Google Agenda (masquées si « à confirmer »). */
export function googlePayload(input: Assignment, techs: Technician[]) {
  const a = maskIfToConfirm(input);
  const recurrence = weeklyRule(a);
  return {
    id: a.id,
    title: `${input.toConfirm ? "⏳" : "🎬"} ${a.title}`,
    location: a.address,
    description: buildHtmlDescription(input),
    start: `${a.dateISO}T${a.startTime || "08:00"}`,
    end: `${a.endDateISO ?? a.dateISO}T${a.endTime || "17:00"}`,
    attendees: techs.map((t) => t.email).filter((e) => /.+@.+\..+/.test(e)),
    recurrence: recurrence ? [recurrence] : [],
    meet: Boolean(input.googleMeet && !input.toConfirm),
    attachments: (a.attachments ?? []).map((f) => ({ name: f.name, type: f.type, dataUrl: f.dataUrl })),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Invitation concise : destinations masquées derrière des libellés, sans doublon d'itinéraire. */
export function buildHtmlDescription(input: Assignment): string {
  const a = maskIfToConfirm(input);
  const parts: string[] = [];
  parts.push(`<b>Mission :</b> ${esc(a.title)}`);
  if (input.toConfirm) {
    parts.push(`<br><i>Rendez-vous à confirmer.</i>`);
  }
  if (a.address) {
    parts.push(`<br><b>Adresse :</b> ${esc(a.address)}`);
    parts.push(`<br><a href="${wazeInvitationUrl(a.address)}">Itinéraire Waze</a>`);
  }
  if (a.notes && !input.toConfirm) parts.push(`<br><br><b>Notes :</b><br>${esc(a.notes).replace(/\n/g, "<br>")}`);
  if (a.link) parts.push(`<br><br><a href="${esc(a.link).replace(/"/g, "&quot;")}">Lien utile</a>`);
  const teamsUrl = a.teamsUrl ? normalizeTeamsUrl(a.teamsUrl) : undefined;
  if (teamsUrl) parts.push(`<br><br><a href="${esc(teamsUrl).replace(/"/g, "&quot;")}">Rejoindre Teams</a>`);
  if (a.attachments?.length) parts.push(`<br><br><b>Documents joints :</b> ${a.attachments.map((f) => esc(f.name)).join(", ")}`);
  return parts.join("");
}
