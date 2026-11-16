import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptedCalendarResult, CalendarForbiddenError, saveCalendarMission } from "./planning-calendar-status";
import type { Assignment } from "./planning-types";

const mission: Assignment = { id: "retry", technicianIds: ["support"], dateISO: "2026-11-16", half: "AM", categoryId: "noc", title: "SUPPORT", address: "", startTime: "08:00", endTime: "12:00" };
describe("Sablier des invitations Google", () => {
  it("enregistre le sablier après un 403 et garde la fiche ouverte", async () => {
    const writes: Assignment[] = []; let closed = false;
    await assert.rejects(saveCalendarMission(mission, async a => { writes.push(a); }, async () => ({ ok: false, status: 403, error: "Quota Google" }), () => { closed = true; }, { saved: false, sent: false }), CalendarForbiddenError);
    assert.equal(writes.length, 2); assert.equal(writes[1].calendarPending, true); assert.equal(closed, false);
  });
  it("retire le sablier uniquement après un nouvel envoi accepté", async () => {
    const writes: Assignment[] = [];
    await saveCalendarMission({ ...mission, calendarPending: true }, async a => { writes.push(a); }, async () => ({ ok: true }), () => {}, { saved: false, sent: false });
    assert.equal(writes[0].calendarPending, true); assert.equal(writes[1].calendarPending, undefined);
    assert.equal(writes[1].id, "retry");
  });
  it("un autre échec ne crée pas de sablier 403", async () => {
    const writes: Assignment[] = [];
    await assert.rejects(saveCalendarMission(mission, async a => { writes.push(a); }, async () => { throw new Error("Google 500"); }, () => {}, { saved: false, sent: false }));
    assert.equal(writes.length, 1); assert.equal(writes[0].calendarPending, undefined);
  });
  it("une exception refusée conserve son identité pour la revalidation", async () => {
    let saved: Assignment | undefined;
    const occurrence = { ...mission, seriesId: "series", originalDateISO: "2026-11-16", originalStartTime: "08:00" };
    await assert.rejects(saveCalendarMission(occurrence, async a => { saved = a; }, async () => ({ ok: false, status: 403, error: "Refus" }), () => {}, { saved: false, sent: false }));
    assert.equal(saved?.calendarPending, true); assert.equal(saved?.seriesId, "series"); assert.equal(saved?.originalDateISO, "2026-11-16");
  });
  it("un résultat 403 transmis par le serveur reste identifiable", () => {
    assert.throws(() => acceptedCalendarResult(JSON.parse('{"ok":false,"status":403,"error":"Refus Google"}')), CalendarForbiddenError);
  });
});