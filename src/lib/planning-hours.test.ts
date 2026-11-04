import { test } from "node:test";
import assert from "node:assert/strict";
import { missionHours } from "./planning-hours";

const draft = { categoryId: "astreinte", categoryLabel: "Astreinte", fullDay: true, fullWeek: false, weekly: false, startTime: "13:30", endTime: "17:30" };

test("Astreinte in a full day uses 10:00–23:00 even from an afternoon slot", () => {
  assert.deepEqual(missionHours(draft), { startTime: "10:00", endTime: "23:00", onCallFullDay: true });
});

test("other periods and categories retain their existing hours", () => {
  assert.deepEqual(missionHours({ ...draft, fullDay: false }), { startTime: "13:30", endTime: "17:30", onCallFullDay: false });
  assert.equal(missionHours({ ...draft, categoryId: "maintenance", categoryLabel: "Maintenance" }).endTime, "18:00");
  assert.equal(missionHours({ ...draft, fullDay: false, fullWeek: true }).endTime, "18:00");
  assert.equal(missionHours({ ...draft, weekly: true }).endTime, "17:30");
});