import type { HalfDay } from "./planning-types";

/** Noon ends in the morning; strictly after 13:00 extends into the afternoon. */
export function endHalfAfterTimeChange(endTime: string, current: HalfDay): HalfDay {
  if (!/^\d{2}:\d{2}$/.test(endTime) || endTime > "23:59") return current;
  if (endTime <= "12:00") return "AM";
  return endTime > "13:00" ? "PM" : current;
}

export function startHalfFromTime(startTime: string, current: HalfDay): HalfDay {
  if (!/^\d{2}:\d{2}$/.test(startTime) || startTime > "23:59") return current;
  return startTime < "13:00" ? "AM" : "PM";
}

/** Resolve displayed and exported hours without changing the mission draft. */
export function missionHours(options: {
  categoryId: string;
  categoryLabel?: string;
  fullDay: boolean;
  fullWeek: boolean;
  weekly: boolean;
  startTime: string;
  endTime: string;
}) {
  const onCall = options.categoryId === "astreinte" || options.categoryLabel?.trim().toLowerCase() === "astreinte";
  const onCallFullDay = onCall && options.fullDay && !options.fullWeek && !options.weekly;
  return {
    startTime: onCallFullDay ? "10:00" : options.startTime,
    endTime: onCallFullDay ? "23:00" : (options.fullDay || options.fullWeek) && !options.weekly ? "18:00" : options.endTime,
    onCallFullDay,
  };
}