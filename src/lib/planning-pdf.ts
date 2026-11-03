import { jsPDF } from "jspdf";
import { type Assignment, type Category, type HalfDay, type Technician } from "./planning-types";
import { assignmentOccursOn } from "./planning-recurrence";

export type PlanningData = { technicians: Technician[]; categories: Category[]; assignments: Assignment[] };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Lundi suivant (date du jour en heure de Paris). */
export function nextMonday(now = new Date()): Date {
  const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const d = new Date(Date.UTC(paris.getFullYear(), paris.getMonth(), paris.getDate()));
  const wd = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (wd === 0 ? 1 : 8 - wd));
  return d;
}

export function periodLabel(start: Date, days = 14): string {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days - 1);
  const f = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  return `du ${f(start)} au ${f(end)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const tint = (c: [number, number, number], k = 0.75) => c.map((v) => Math.round(v + (255 - v) * k)) as [number, number, number];

/** Dessine le planning (techniciens × jours × demi-journées) dans un PDF A3 paysage. Renvoie le PDF en base64. */
export function buildPlanningPdf(data: PlanningData, start: Date, days = 14): string {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const m = 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(`Planning techniciens — ${periodLabel(start, days)}`, m, m + 4);

  const dates = Array.from({ length: days }, (_, i) => { const d = new Date(start); d.setUTCDate(d.getUTCDate() + i); return d; });
  const nameW = 38;
  const cellW = (W - 2 * m - nameW) / (days * 2);
  const top = m + 10;
  const headH = 12;
  const legendH = 12;
  const rowH = Math.min(22, (H - top - headH - m - legendH) / Math.max(1, data.technicians.length));

  // En-tête jours
  pdf.setFontSize(8);
  dates.forEach((d, i) => {
    const x = m + nameW + i * 2 * cellW;
    const we = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    pdf.setFillColor(...(we ? [225, 225, 225] as [number, number, number] : [240, 240, 240] as [number, number, number]));
    pdf.rect(x, top, cellW * 2, headH, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.text(`${DAYS[d.getUTCDay()]} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`, x + cellW, top + 4.5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.text("Matin", x + cellW / 2, top + 10, { align: "center" });
    pdf.text("Après-midi", x + cellW * 1.5, top + 10, { align: "center" });
    pdf.setFontSize(8);
  });
  pdf.setFillColor(240, 240, 240);
  pdf.rect(m, top, nameW, headH, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.text("Technicien", m + 2, top + 7);

  const find = (techId: string, dISO: string, half: HalfDay) =>
    data.assignments.find((a) => a.technicianIds.includes(techId) && assignmentOccursOn(a, dISO, half));

  data.technicians.forEach((t, r) => {
    const y = top + headH + r * rowH;
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(m, y, nameW, rowH, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(pdf.splitTextToSize(t.name, nameW - 4).slice(0, 2), m + 2, y + 5);
    dates.forEach((d, i) => {
      (["AM", "PM"] as HalfDay[]).forEach((half, h) => {
        const x = m + nameW + (i * 2 + h) * cellW;
        const a = find(t.id, iso(d), half);
        const cat = a ? data.categories.find((c) => c.id === a.categoryId) : undefined;
        const we = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const fill: [number, number, number] = cat ? tint(hexToRgb(cat.color)) : we ? [245, 245, 245] : [255, 255, 255];
        pdf.setFillColor(...fill);
        pdf.rect(x, y, cellW, rowH, "FD");
        if (a) {
          pdf.setFontSize(5.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...(cat ? hexToRgb(cat.color) : [0, 0, 0] as [number, number, number]));
          pdf.text(`${a.toConfirm ? "* " : ""}${cat?.label ?? ""}`, x + 0.8, y + 2.8, { maxWidth: cellW - 1.6 });
          pdf.setTextColor(30, 30, 30);
          pdf.setFont("helvetica", "normal");
          pdf.text(pdf.splitTextToSize(a.title, cellW - 1.6).slice(0, Math.floor((rowH - 4) / 2.3)), x + 0.8, y + 5.5);
        }
      });
    });
  });
  pdf.setTextColor(0, 0, 0);

  // Légende
  const ly = top + headH + data.technicians.length * rowH + 6;
  let lx = m;
  pdf.setFontSize(8);
  data.categories.forEach((c) => {
    pdf.setFillColor(...hexToRgb(c.color));
    pdf.rect(lx, ly - 3, 4, 4, "F");
    pdf.text(c.label, lx + 5.5, ly);
    lx += 8 + pdf.getTextWidth(c.label) + 4;
  });
  pdf.text("*  mission à confirmer", lx + 4, ly);

  return pdf.output("datauristring").split(",")[1];
}
