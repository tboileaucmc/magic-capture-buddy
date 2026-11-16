import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calendarNeedsPlanningWrite } from "./planning-calendar-save";
import type { Assignment } from "./planning-types";

const mission = { id: "mission", title: "Support", address: "", startTime: "08:00", endTime: "12:00", technicianIds: ["support"], dateISO: "2026-11-16", half: "AM", categoryId: "noc" } satisfies Assignment;
describe("Écriture après invitation", () => {
  it("ne réécrit pas une mission déjà enregistrée sans nouveau lien", () => {
    assert.equal(calendarNeedsPlanningWrite(mission, undefined), false);
    assert.equal(calendarNeedsPlanningWrite({ ...mission, meetUrl: "https://meet.google.com/abc" }, "https://meet.google.com/abc"), false);
  });
  it("enregistre un nouveau lien Meet", () => {
    assert.equal(calendarNeedsPlanningWrite(mission, "https://meet.google.com/abc"), true);
  });
  it("enregistre toujours une exception de série envoyée avant sauvegarde", () => {
    assert.equal(calendarNeedsPlanningWrite({ ...mission, seriesId: "series" }, undefined), true);
  });
});