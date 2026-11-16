import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { persistPlanningMutation, planningMutationQueue, type PlanningSnapshot } from "./planning-persistence";

const snapshot = (): PlanningSnapshot => ({ data: { technicians: [], categories: [], assignments: [] }, updatedAt: "2026-11-16T11:15:00.000Z" });

describe("Sauvegarde confirmée du planning", () => {
  it("conserve une modification concurrente au lieu d’écraser le planning partagé", async () => {
    let remote = snapshot();
    let writes = 0;
    const saved = await persistPlanningMutation({
      read: async () => structuredClone(remote),
      write: async (data, previousVersion, nextVersion) => {
        if (++writes === 1) {
          remote = { data: { ...remote.data, technicians: [{ id: "other", name: "Autre", email: "" }] }, updatedAt: "2026-11-16T11:16:00.000Z" };
          return null;
        }
        assert.equal(previousVersion, remote.updatedAt);
        remote = { data, updatedAt: nextVersion };
        return remote;
      },
    }, (data) => ({ ...data, categories: [...data.categories, { id: "noc", label: "NOC", color: "test" }] }));
    assert.equal(saved.data.technicians[0]?.id, "other");
    assert.equal(saved.data.categories[0]?.id, "noc");
    assert.deepEqual((await Promise.resolve(structuredClone(remote))).data, saved.data);
    assert.equal(writes, 2);
  });
  it("ne confirme pas la sauvegarde quand l’écriture est refusée", async () => {
    await assert.rejects(persistPlanningMutation({ read: async () => snapshot(), write: async () => { throw new Error("Écriture refusée"); } }, (data) => data), /Écriture refusée/);
  });
  it("signale les conflits persistants après cinq tentatives", async () => {
    let writes = 0;
    await assert.rejects(persistPlanningMutation({ read: async () => snapshot(), write: async () => { writes++; return null; } }, (data) => data), /n’a pas été enregistrée/);
    assert.equal(writes, 5);
  });
  it("attend la première sauvegarde avant la suivante et continue après un échec", async () => {
    const enqueue = planningMutationQueue();
    const order: number[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const first = enqueue(async () => { order.push(1); await gate; throw new Error("refus"); });
    const second = enqueue(async () => { order.push(2); return "saved"; });
    await Promise.resolve();
    assert.deepEqual(order, [1]);
    release();
    await assert.rejects(first, /refus/);
    assert.equal(await second, "saved");
    assert.deepEqual(order, [1, 2]);
  });
});