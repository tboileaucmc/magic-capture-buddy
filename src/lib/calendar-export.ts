import type { Assignment, Technician } from "./planning-types";

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
    const enc = encodeURIComponent(a.address);
    lines.push(`Adresse: ${a.address}`);
    lines.push(`Google Maps: https://www.google.com/maps/search/?api=1&query=${enc}`);
    lines.push(`Waze: https://waze.com/ul?q=${enc}&navigate=yes`);
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
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SEQUENCE:${a.sequence ?? 0}`,
    `DTSTAMP:${fmtICS(new Date())}`,
    `DTSTART:${fmtICS(start)}`,
    `DTEND:${fmtICS(end)}`,
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
  return {
    id: a.id,
    title: `${input.toConfirm ? "⏳" : "🎬"} ${a.title}`,
    location: a.address,
    description: buildHtmlDescription(input),
    start: `${a.dateISO}T${a.startTime || "08:00"}`,
    end: `${a.endDateISO ?? a.dateISO}T${a.endTime || "17:00"}`,
    attendees: techs.map((t) => t.email).filter((e) => /.+@.+\..+/.test(e)),
    attachments: (a.attachments ?? []).map((f) => ({ name: f.name, type: f.type, dataUrl: f.dataUrl })),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Description HTML chaleureuse pour l'invitation Google Agenda. */
export function buildHtmlDescription(input: Assignment): string {
  const a = maskIfToConfirm(input);
  const parts: string[] = [];
  parts.push(`👋 <b>Bonjour !</b><br>Une nouvelle mission vous attend. Voici tout ce qu'il faut savoir :`);
  parts.push(`<br><br>🎬 <b>Mission :</b> ${esc(a.title)}`);
  if (input.toConfirm) {
    parts.push(`<br><br>⏳ <i>Ce rendez-vous est encore à confirmer. Gardez le créneau libre, les détails arrivent très vite !</i>`);
  }
  if (a.address) {
    const enc = encodeURIComponent(a.address);
    parts.push(`<br>📍 <b>Où :</b> ${esc(a.address)}`);
    parts.push(`<br>🚗 <a href="https://waze.com/ul?q=${enc}&navigate=yes">Y aller avec Waze</a> · 🗺️ <a href="https://www.google.com/maps/search/?api=1&query=${enc}">Ouvrir dans Google Maps</a>`);
  }
  if (a.notes && !input.toConfirm) parts.push(`<br><br>📝 <b>Notes :</b><br>${esc(a.notes).replace(/\n/g, "<br>")}`);
  if (a.link) parts.push(`<br><br>🔗 <a href="${esc(a.link)}">Lien utile</a>`);
  const teamsUrl = a.teamsUrl ? normalizeTeamsUrl(a.teamsUrl) : undefined;
  if (teamsUrl) parts.push(`<br><br>💻 <a href="${esc(teamsUrl).replace(/"/g, "&quot;")}">Rejoindre la réunion Teams</a>`);
  if (a.attachments?.length) parts.push(`<br><br>📎 Documents joints : ${a.attachments.map((f) => esc(f.name)).join(", ")}`);
  parts.push(`<br><br>Bonne mission et merci ! 🙌<br><i>— L'équipe Planning Cinemeccanica</i>`);
  return parts.join("");
}
