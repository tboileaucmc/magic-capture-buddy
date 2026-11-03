import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignmentOccursOn, nextWeeklyDate, weeklyRule, meetingOccurrence, saveMeetingAssignment } from "./planning-recurrence";
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
  it("modifie uniquement le vendredi sélectionné et garde les autres vendredis à 15h30", () => {
    const edited = { ...meetingOccurrence(meeting, "2026-11-06"), startTime: "16:00", endTime: "16:30" };
    const [series, exception] = saveMeetingAssignment([meeting], edited);
    assert.equal(assignmentOccursOn(series, "2026-11-06", "PM"), false);
    assert.equal(assignmentOccursOn(exception, "2026-11-06", "PM"), true);
    assert.equal(exception.startTime, "16:00");
    assert.equal(series.startTime, "15:30");
    assert.equal(assignmentOccursOn(series, "2026-11-13", "PM"), true);
    assert.deepEqual(googlePayload(exception, []).occurrence, { seriesId: "weekly-test", dateISO: "2026-11-06", startTime: "15:30" });
    const ics = buildICS(exception, []);
    assert.ok(ics.includes("UID:weekly-test@planning.local"));
    assert.ok(ics.includes("RECURRENCE-ID;TZID=Europe/Paris:20261106T153000"));
    assert.ok(!ics.includes("RRULE:FREQ=WEEKLY"));
  });
  it("déplace une seule réunion et conserve son identité lors des modifications suivantes", () => {
    const moved = { ...meetingOccurrence(meeting, "2026-11-06"), dateISO: "2026-11-09" };
    const first = saveMeetingAssignment([meeting], moved);
    const second = saveMeetingAssignment(first, { ...moved, title: "Réunion déplacée" });
    assert.equal(second.length, 2);
    assert.deepEqual(second[0].excludedDates, ["2026-11-06"]);
    assert.equal(assignmentOccursOn(second[1], "2026-11-09", "PM"), true);
    assert.equal(second[1].originalDateISO, "2026-11-06");
  });
  it("modifie la récurrence de toute la série sans écraser la réunion isolée", () => {
    const first = saveMeetingAssignment([meeting], meetingOccurrence(meeting, "2026-11-06"));
    const changed = saveMeetingAssignment(first, { ...first[0], startTime: "17:00" });
    const series = changed.find((a) => a.id === meeting.id);
    assert.ok(series);
    assert.equal(series.startTime, "17:00");
    assert.equal(assignmentOccursOn(series, "2026-11-13", "PM"), true);
    assert.equal(assignmentOccursOn(series, "2026-11-06", "PM"), false);
    assert.equal(changed.find((a) => a.seriesId)?.startTime, "15:30");
  });
});