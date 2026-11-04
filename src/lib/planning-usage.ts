export type UsageSample = {
  day: string;
  measured_at: string;
  mission_count: number;
  recurring_count: number;
  exception_count: number;
  planning_json_bytes: number;
  planning_table_bytes: number;
  history_table_bytes: number;
  database_bytes: number;
};
export type PlanningUsage = { current: UsageSample; history: UsageSample[] };

export function usageChange(current: UsageSample, previous?: UsageSample) {
  if (!previous || previous.day === current.day) return null;
  return {
    missions: current.mission_count - previous.mission_count,
    planningBytes: current.planning_json_bytes - previous.planning_json_bytes,
  };
}

export function formatBytes(bytes: number) {
  const absolute = Math.abs(bytes);
  if (absolute < 1000) return `${bytes.toLocaleString("fr-FR")} octets`;
  if (absolute < 1_000_000) return `${(bytes / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ko`;
  return `${(bytes / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Mo`;
}