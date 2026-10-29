import { buildPlanningPdf, nextMonday, periodLabel, type PlanningData } from "./planning-pdf";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

/** Numéro de semaine ISO 8601 (semaine 1 = celle contenant le premier jeudi). */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

/** Génère le PDF des 2 semaines à venir et l'envoie depuis planning.cinemeccanica@gmail.com (destinataires en copie cachée). */
export async function sendPlanningMail(data: PlanningData, recipients: string[]) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !mailKey) throw new Error("Gmail non connecté");
  if (recipients.length === 0) throw new Error("La liste de diffusion est vide");
  const start = nextMonday();
  const label = periodLabel(start);
  const weeks = [0, 7].map((offset) => {
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    const n = isoWeek(d);
    return { name: `Planning_S${String(n).padStart(2, "0")}_${d.getFullYear()}.pdf`, pdf: buildPlanningPdf(data, d, 7) };
  });
  const boundary = "planning" + Date.now();
  const subject = `📅 Planning techniciens — ${label}`;
  const html = `<p>Bonjour à tous 👋</p><p>Vous trouverez en pièce jointe les plannings des techniciens (un PDF par semaine) pour la période <b>${label}</b>.</p><p>Bonne semaine !<br><i>— L'équipe Planning Cinemeccanica</i></p>`;
  const raw = [
    `From: ${header("Planning Cinemeccanica")} <planning.cinemeccanica@gmail.com>`,
    `To: planning.cinemeccanica@gmail.com`,
    `Bcc: ${recipients.join(", ")}`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(html),
    ...weeks.flatMap((w) => [
      `--${boundary}`,
      `Content-Type: application/pdf; name="${w.name}"`,
      `Content-Disposition: attachment; filename="${w.name}"`,
      "Content-Transfer-Encoding: base64",
      "",
      w.pdf.match(/.{1,76}/g)?.join("\r\n") ?? "",
    ]),
    `--${boundary}--`,
  ].join("\r\n");
  const encoded = b64(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await fetch("https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mailKey, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`Gmail [${res.status}]: ${t}`);
    throw new Error(`Envoi échoué [${res.status}]: ${t.slice(0, 300)}`);
  }
  return { count: recipients.length, label };
}
