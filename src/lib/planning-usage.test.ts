import { test } from "node:test";
import assert from "node:assert/strict";
import { usageChange, type UsageSample } from "./planning-usage";

const sample: UsageSample = { day: "2026-11-04", measured_at: "2026-11-04T08:00:00Z", mission_count: 20, recurring_count: 2, exception_count: 1, planning_json_bytes: 4000, planning_table_bytes: 8000, history_table_bytes: 6000, database_bytes: 17000000 };

test("planning growth excludes database and internal table overhead", () => {
  const previous = { ...sample, day: "2026-11-03", mission_count: 18, planning_json_bytes: 3000, database_bytes: 16000000 };
  assert.deepEqual(usageChange(sample, previous), { missions: 2, planningBytes: 1000 });
});
test("no historical evolution is inferred from a single day", () => {
  assert.equal(usageChange(sample), null);
  assert.equal(usageChange(sample, { ...sample, mission_count: 10 }), null);
});