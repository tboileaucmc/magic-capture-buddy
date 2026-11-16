import { test } from "node:test";
import assert from "node:assert/strict";
import { missionHours, endHalfAfterTimeChange, startHalfFromTime } from "./planning-hours";
import { assignmentSlots } from "./planning-types";

const draft = { categoryId: "astreinte", categoryLabel: "Astreinte", fullDay: true, fullWeek: false, weekly: false, startTime: "13:30", endTime: "17:30" };

test("08:00–15:00 covers morning and afternoon after editing the end time", () => {
  const endHalf = endHalfAfterTimeChange("15:00", "AM");
  assert.equal(endHalf, "PM");
  assert.deepEqual(assignmentSlots({ dateISO: "2026-11-13", half: "AM", endHalf }), [
    { dateISO: "2026-11-13", half: "AM" },
    { dateISO: "2026-11-13", half: "PM" },
  ]);
});

test("only an end time strictly after 13:00 switches the selection", () => {
  assert.equal(endHalfAfterTimeChange("13:01", "AM"), "PM");
  assert.equal(endHalfAfterTimeChange("13:00", "AM"), "AM");
  assert.equal(endHalfAfterTimeChange("12:00", "PM"), "AM");
  assert.equal(endHalfAfterTimeChange("", "AM"), "AM");
});

test("7 December 13:00 to 8 December 12:00 covers only first afternoon and last morning", () => {
  assert.deepEqual(assignmentSlots({ dateISO: "2026-12-07", endDateISO: "2026-12-08", half: startHalfFromTime("13:00", "AM"), endHalf: endHalfAfterTimeChange("12:00", "PM") }), [
    { dateISO: "2026-12-07", half: "PM" },
    { dateISO: "2026-12-08", half: "AM" },
  ]);
});

test("existing Saint-Aignan maintenance ending at 11:00 ignores its stale PM end flag", () => {
  assert.deepEqual(assignmentSlots({ dateISO: "2026-12-07", endDateISO: "2026-12-08", startTime: "13:00", endTime: "11:00", half: "PM", endHalf: "PM" }), [
    { dateISO: "2026-12-07", half: "PM" },
    { dateISO: "2026-12-08", half: "AM" },
  ]);
});

test("Astreinte in a full day uses 10:00–23:00 even from an afternoon slot", () => {
  assert.deepEqual(missionHours(draft), { startTime: "10:00", endTime: "23:00", onCallFullDay: true });
});

test("other periods and categories retain their existing hours", () => {
  assert.deepEqual(missionHours({ ...draft, fullDay: false }), { startTime: "13:30", endTime: "17:30", onCallFullDay: false });
  assert.equal(missionHours({ ...draft, categoryId: "maintenance", categoryLabel: "Maintenance" }).endTime, "18:00");
  assert.equal(missionHours({ ...draft, fullDay: false, fullWeek: true }).endTime, "18:00");
  assert.equal(missionHours({ ...draft, weekly: true }).endTime, "17:30");
});