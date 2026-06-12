import type { Assignment, Technician } from "./planning-types";

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

export function buildDescription(a: Assignment): string {
  const lines: string[] = [];
  if (a.address) {
    const enc = encodeURIComponent(a.address);
    lines.push(`Adresse: ${a.address}`);
    lines.push(`Google Maps: https://www.google.com/maps/search/?api=1&query=${enc}`);
    lines.push(`Waze: https://waze.com/ul?q=${enc}&navigate=yes`);
  }
  if (a.notes) lines.push("", a.notes);
  if (a.link) lines.push("", `Lien: ${a.link}`);
  if (a.attachments?.length) {
    lines.push("", "Pièces jointes:");
    a.attachments.forEach((f) => lines.push(`- ${f.name}`));
  }
  return lines.join("\n");
}

export function buildICS(a: Assignment, techs: Technician[]): string {
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
    `DTSTAMP:${fmtICS(new Date())}`,
    `DTSTART:${fmtICS(start)}`,
    `DTEND:${fmtICS(end)}`,
    `SUMMARY:${a.title}`,
    `LOCATION:${a.address}`,
    `DESCRIPTION:${desc}`,
    `ORGANIZER;CN=Planning:mailto:planning@local`,
    ...attendees,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(a: Assignment, techs: Technician[]) {
  const ics = buildICS(a, techs);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${a.title.replace(/[^a-z0-9]+/gi, "_")}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(a: Assignment, techs: Technician[]): string {
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

export function mailtoUrl(a: Assignment, techs: Technician[]): string {
  const subject = `Mission: ${a.title} — ${a.dateISO} ${a.half}`;
  const body = buildDescription(a);
  const to = techs.map((t) => t.email).join(",");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
