/** National public holidays in metropolitan France; local exceptions are excluded. */
export function frenchHolidayName(date: Date): string | undefined {
  const year = date.getFullYear();
  const key = `${date.getMonth() + 1}-${date.getDate()}`;
  const fixed: Record<string, string> = {
    "1-1": "Jour de l’an",
    "5-1": "Fête du Travail",
    "5-8": "Victoire de 1945",
    "7-14": "Fête nationale",
    "8-15": "Assomption",
    "11-1": "Toussaint",
    "11-11": "Armistice",
    "12-25": "Noël",
  };
  if (fixed[key]) return fixed[key];

  // Gregorian computus (Meeus/Jones/Butcher).
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  for (const [offset, name] of [[1, "Lundi de Pâques"], [39, "Ascension"], [50, "Lundi de Pentecôte"]] as const) {
    const holiday = new Date(year, month - 1, day + offset);
    if (holiday.getMonth() === date.getMonth() && holiday.getDate() === date.getDate()) return name;
  }
  return undefined;
}

export function planningDayKind(date: Date): "holiday" | "weekend" | "weekday" {
  if (frenchHolidayName(date)) return "holiday";
  return date.getDay() === 0 || date.getDay() === 6 ? "weekend" : "weekday";
}