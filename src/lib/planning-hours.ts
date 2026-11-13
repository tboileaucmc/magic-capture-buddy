import type { HalfDay } from "./planning-types";

/** An edited end time after 13:00 extends the mission into the afternoon. */
export function endHalfAfterTimeChange(endTime: string, current: HalfDay): HalfDay {
  return /^\d{2}:\d{2}$/.test(endTime) && endTime > "13:00" && endTime <= "23:59" ? "PM" : current;
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