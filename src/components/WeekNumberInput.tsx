import { useEffect, useState } from "react";

/** ISO week number and ISO year of a local date. */
function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7), year: d.getUTCFullYear() };
}

/** Local Monday of ISO week `week` in ISO year `year`. */
function mondayOfIsoWeek(year: number, week: number) {
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7));
  monday.setDate(monday.getDate() + (week - 1) * 7);
  return monday;
}

/** Editable week number: validated on blur or Enter, like the date input. */
export function WeekNumberInput({ weekStart, onSelect }: { weekStart: Date; onSelect: (monday: Date) => void }) {
  const { week, year } = isoWeek(weekStart);
  const [draft, setDraft] = useState(String(week).padStart(2, "0"));
  useEffect(() => setDraft(String(week).padStart(2, "0")), [week]);

  const commit = () => {
    const n = Number(draft);
    const max = isoWeek(new Date(year, 11, 28)).week;
    if (!Number.isInteger(n) || n < 1 || n > max) return setDraft(String(week).padStart(2, "0"));
    if (n !== week) onSelect(mondayOfIsoWeek(year, n));
    else setDraft(String(week).padStart(2, "0"));
  };

  return (
    <label className="flex items-center rounded-md border border-primary/50 px-2 py-1 text-sm font-semibold text-primary" title="Numéro de semaine (modifiable)">
      S
      <input
        aria-label="Numéro de semaine"
        inputMode="numeric"
        className="w-7 bg-transparent text-center outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      />
    </label>
  );
}
