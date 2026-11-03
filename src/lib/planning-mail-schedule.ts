import { frenchHolidayName } from "./planning-day";

/** Decide from Paris calendar dates, independently of the server timezone. */
export function shouldSendWeeklyPlanning(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const today = new Date(value("year"), value("month") - 1, value("day"), 12);
  const day = today.getDay();
  if (day !== 3 && day !== 4) return false;
  const thursday = new Date(today);
  if (day === 3) thursday.setDate(thursday.getDate() + 1);
  const holiday = Boolean(frenchHolidayName(thursday));
  return holiday ? day === 3 && value("hour") === 17 : day === 4 && value("hour") === 14;
}