import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptedCalendarResult, CalendarForbiddenError, missionNeedsCalendar, saveCalendarMission } from "./planning-calendar-status";
import type { Assignment } from "./planning-types";

const mission: Assignment = { id: "retry", technicianIds: ["support"], dateISO: "2026-11-16", half: "AM", categoryId: "noc", title: "SUPPORT", address: "", startTime: "08:00", endTime: "12:00" };
const categories = [{ id: "travel-custom-id", label: "Trajet" }, { id: "noc", label: "NOC" }];
describe("Missions Trajet sans notifications d’agenda", () => {
  it("reconnaît Trajet par son libellé et conserve les autres envois", () => {
    assert.equal(missionNeedsCalendar({ categoryId: "travel-custom-id" }, categories), false);
    assert.equal(missionNeedsCalendar(mission, categories), true);
    assert.equal(missionNeedsCalendar({ categoryId: "travel-custom-id" }, [{ id: "travel-custom-id", label: " TRAJET " }]), false);
  });
  it("enregistre Trajet une seule fois sans appeler Google et retire le sablier devenu inutile", async () => {
    const writes: Assignment[] = []; let sends = 0; let closed = false;
    const outcome = { saved: false, sent: false };
    await saveCalendarMission({ ...mission, categoryId: "travel-custom-id", calendarPending: true }, async a => { writes.push(a); }, async () => { sends++; return { ok: true }; }, () => { closed = true; }, outcome, categories);
    assert.equal(sends, 0); assert.equal(writes.length, 1); assert.equal(writes[0].categoryId, "travel-custom-id");
    assert.equal(writes[0].calendarPending, undefined); assert.equal(closed, true);
    assert.deepEqual(outcome, { saved: true, sent: false });
  });
  it("enregistre aussi une exception Trajet sans invitation", async () => {
    let saved: Assignment | undefined; let sends = 0;
    await saveCalendarMission({ ...mission, categoryId: "travel-custom-id", seriesId: "series", originalDateISO: "2026-11-16", originalStartTime: "08:00" }, async a => { saved = a; }, async () => { sends++; return { ok: true }; }, () => {}, { saved: false, sent: false }, categories);
    assert.equal(sends, 0); assert.equal(saved?.seriesId, "series"); assert.equal(saved?.originalDateISO, "2026-11-16");
  });
  it("garde la fiche ouverte si l’enregistrement du Trajet échoue", async () => {
    let closed = false; let sends = 0;
    await assert.rejects(saveCalendarMission({ ...mission, categoryId: "travel-custom-id" }, async () => { throw new Error("Échec planning"); }, async () => { sends++; return { ok: true }; }, () => { closed = true; }, { saved: false, sent: false }, categories), /Échec planning/);
    assert.equal(closed, false); assert.equal(sends, 0);
  });
});
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