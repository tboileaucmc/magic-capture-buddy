import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  recipients: z.array(z.string().email()).min(1).max(100),
  periodLabel: z.string().max(200),
  pdfBase64: z.string().min(10).max(20_000_000),
});

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

/** Envoie le planning PDF depuis planning.cinemeccanica@gmail.com à la liste de diffusion (en copie cachée). */
export const sendPlanningPdf = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mailKey = process.env.GOOGLE_MAIL_API_KEY;
    if (!lovableKey || !mailKey) throw new Error("Gmail non connecté");
    const boundary = "planning" + Date.now();
    const subject = `📅 Planning techniciens — ${data.periodLabel}`;
    const html = `<p>Bonjour à tous 👋</p><p>Vous trouverez en pièce jointe le planning des techniciens pour la période <b>${data.periodLabel}</b>.</p><p>Bonne semaine !<br><i>— L'équipe Planning Cinemeccanica</i></p>`;
    const pdfLines = data.pdfBase64.match(/.{1,76}/g)?.join("\r\n") ?? "";
    const raw = [
      `From: ${header("Planning Cinemeccanica")} <planning.cinemeccanica@gmail.com>`,
      `To: planning.cinemeccanica@gmail.com`,
      `Bcc: ${data.recipients.join(", ")}`,
      `Subject: ${header(subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      b64(html),
      `--${boundary}`,
      'Content-Type: application/pdf; name="planning.pdf"',
      'Content-Disposition: attachment; filename="planning.pdf"',
      "Content-Transfer-Encoding: base64",
      "",
      pdfLines,
      `--${boundary}--`,
    ].join("\r\n");
    const encoded = b64(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const res = await fetch("https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`Gmail [${res.status}]: ${t}`);
      throw new Error(`Envoi échoué [${res.status}]: ${t.slice(0, 300)}`);
    }
    return { ok: true, count: data.recipients.length };
  });
