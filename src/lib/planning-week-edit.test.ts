import { test } from "node:test";
import assert from "node:assert/strict";
import { missionDates, splitMissionDays, replaceSplitMission } from "./planning-week-edit";
import { assignmentSlots, type Assignment } from "./planning-types";

const week: Assignment = { id: "week", technicianIds: ["thomas", "hugo"], dateISO: "2026-11-02", endDateISO: "2026-11-06", half: "AM", endHalf: "PM", categoryId: "astreinte", title: "Astreinte", address: "", startTime: "10:00", endTime: "23:00" };
let id = 0;
const uid = () => `split-${++id}`;
test("modifying Wednesday for Thomas keeps every Hugo day and all other Thomas days", () => {
  const result = splitMissionDays(week, "thomas", ["2026-11-04"], { ...week, title: "SUPPORT", categoryId: "noc" }, uid);
  assert.deepEqual(missionDates(result[0]), missionDates(week));
  assert.deepEqual(result[0].technicianIds, ["hugo"]);
  for (const day of missionDates(week)) {
    const rows = result.filter((a) => a.technicianIds.includes("thomas") && missionDates(a).includes(day));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, day === "2026-11-04" ? "SUPPORT" : "Astreinte");
  }
});
test("multiple nonconsecutive days become independent without duplicate half-days", () => {
  const original = { ...week, technicianIds: ["thomas"] };
  const result = splitMissionDays(original, "thomas", ["2026-11-03", "2026-11-05"], { ...original, title: "Modifié" }, uid);
  assert.equal(result.filter((a) => a.title === "Modifié").length, 2);
  const slots = result.flatMap(assignmentSlots).map((s) => `${s.dateISO}-${s.half}`);
  assert.equal(slots.length, 10);
  assert.equal(new Set(slots).size, 10);
  assert.equal(new Set(result.map((a) => a.id)).size, result.length);
  assert.equal(replaceSplitMission([original, { ...week, id: "unrelated" }], original, result).some((a) => a.id === "unrelated"), true);
});
test("all selected days retain an original event ID and never affect unrelated technicians", () => {
  const original = { ...week, technicianIds: ["thomas"] };
  const result = splitMissionDays(original, "thomas", missionDates(original), { ...original, title: "Modifié" }, uid);
  assert.equal(result.length, 5);
  assert.equal(result[0].id, "week");
  assert.ok(result.every((a) => a.title === "Modifié" && a.technicianIds.join() === "thomas"));
});
test("rejects stale missions and days outside the mission", () => {
  assert.throws(() => splitMissionDays(week, "thomas", ["2026-11-09"], week, uid));
  assert.throws(() => replaceSplitMission([{ ...week, title: "Changed" }], week, [week]));
});