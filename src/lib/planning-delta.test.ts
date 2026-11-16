import { it } from "node:test";
import assert from "node:assert/strict";
import { planningDelta } from "./planning-delta";
import type { PlanningData } from "./planning-persistence";

const before: PlanningData = { technicians: [], categories: [], assignments: [{ id: "a", title: "Avant", address: "", startTime: "08:00", endTime: "12:00", dateISO: "2026-11-16", half: "AM", categoryId: "noc", technicianIds: ["support"], attachments: [{ name: "ordre.pdf", type: "application/pdf", dataUrl: "data:application/pdf;base64," + "A".repeat(1000000) }] }] };
it("une modification d’intitulé ne transfère pas la pièce jointe inchangée", () => {
  const patch = planningDelta(before, { ...before, assignments: [{ ...before.assignments[0], title: "Après" }] });
  assert.deepEqual(patch.assignments?.update.a?.set, { title: "Après" });
  assert.ok(JSON.stringify(patch).length < 200);
});
it("transmet les suppressions et nouveaux éléments sans toucher aux autres rubriques", () => {
  const patch = planningDelta(before, { ...before, assignments: [] });
  assert.deepEqual(patch.assignments?.remove, ["a"]);
  assert.equal(patch.technicians, undefined);
});