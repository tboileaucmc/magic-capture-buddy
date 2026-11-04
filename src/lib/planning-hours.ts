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