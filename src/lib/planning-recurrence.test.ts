import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignmentOccursOn, nextWeeklyDate, weeklyRule } from "./planning-recurrence";
import { buildICS, googlePayload } from "./calendar-export";
import type { Assignment } from "./planning-types";

const meeting: Assignment = {
  id: "weekly-test", technicianIds: ["tech"], dateISO: "2026-10-30", half: "PM",
  categoryId: "chantier", title: "Réunion Teams", address: "", startTime: "15:30", endTime: "16:00",
  teamsUrl: "https://teams.microsoft.com/meet/123", recurrence: "weekly",
};

describe("Réunions hebdomadaires", () => {
  it("répète chaque vendredi à 15h30 sans date de fin dans les invitations", () => {
    assert.equal(weeklyRule(meeting), "RRULE:FREQ=WEEKLY;BYDAY=FR");
    const payload = googlePayload(meeting, []);
    assert.deepEqual(payload.recurrence, ["RRULE:FREQ=WEEKLY;BYDAY=FR"]);
    assert.equal(payload.start, "2026-10-30T15:30");
    const ics = buildICS(meeting, []);
    assert.ok(ics.includes("DTSTART;TZID=Europe/Paris:20261030T153000"));
    assert.ok(ics.includes("RRULE:FREQ=WEEKLY;BYDAY=FR\r\n"));
    assert.ok(!ics.includes("UNTIL="));
    assert.ok(!ics.includes("COUNT="));
    assert.ok(ics.includes("TZID:Europe/Paris"));
  });
  it("affiche les vendredis futurs même très éloignés, mais pas avant le début ni les autres créneaux", () => {
    for (const date of ["2026-10-30", "2026-11-06", "2027-04-02", "2036-10-31"]) {
      assert.equal(assignmentOccursOn(meeting, date, "PM"), true, date);
      assert.equal(assignmentOccursOn(meeting, date, "AM"), false, date);
    }
    assert.equal(assignmentOccursOn(meeting, "2026-10-23", "PM"), false);
    assert.equal(assignmentOccursOn(meeting, "2026-11-05", "PM"), false);
    assert.equal(assignmentOccursOn(meeting, "2026-11-07", "PM"), false);
  });
  it("choisit le premier vendredi à partir de la date de la fiche", () => {
    assert.equal(nextWeeklyDate("2026-10-29", 5), "2026-10-30");
    assert.equal(nextWeeklyDate("2026-10-30", 5), "2026-10-30");
    assert.equal(nextWeeklyDate("2026-10-31", 5), "2026-11-06");
  });
  it("ne répète pas les missions ordinaires et conserve leur période multi-jours", () => {
    const ordinary = { ...meeting, recurrence: undefined, endDateISO: "2026-11-02", endHalf: "AM" as const };
    assert.equal(assignmentOccursOn(ordinary, "2026-10-31", "AM"), true);
    assert.equal(assignmentOccursOn(ordinary, "2026-11-02", "AM"), true);
    assert.equal(assignmentOccursOn(ordinary, "2026-11-02", "PM"), false);
    assert.equal(assignmentOccursOn(ordinary, "2026-11-06", "PM"), false);
    assert.deepEqual(googlePayload(ordinary, []).recurrence, []);
  });
});