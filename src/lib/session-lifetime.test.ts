import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionDuration, sessionMustEnd, readSessionLifetime } from "./session-lifetime";

const record = { sessionId: "same-login", startedAt: 1000, browserId: "browser" };
describe("Déconnexion automatique par niveau de compte", () => {
  it("déconnecte la lecture seule à une heure exactement, même active", () => {
    assert.equal(sessionDuration("viewer"), 3_600_000);
    assert.equal(sessionMustEnd(record, "viewer", "browser", 3_600_999), false);
    assert.equal(sessionMustEnd(record, "viewer", "browser", 3_601_000), true);
  });
  it("déconnecte Admin support à huit heures", () => {
    assert.equal(sessionDuration("support_editor"), 28_800_000);
    assert.equal(sessionMustEnd(record, "support_editor", "browser", 28_800_999), false);
    assert.equal(sessionMustEnd(record, "support_editor", "browser", 28_801_000), true);
  });
  it("déconnecte les super administrateurs à huit heures", () => {
    assert.equal(sessionDuration("admin"), 28_800_000);
    assert.equal(sessionMustEnd(record, "admin", "browser", 28_800_999), false);
    assert.equal(sessionMustEnd(record, "admin", "browser", 28_801_000), true);
  });
  it("déconnecte la lecture seule sans marqueur de navigateur, mais pas les administrateurs", () => {
    assert.equal(sessionMustEnd(record, "viewer", null, 2000), true);
    assert.equal(sessionMustEnd(record, "admin", null, 2000), false);
    assert.equal(sessionMustEnd(record, "support_editor", null, 2000), false);
  });
  it("conserve la session entre onglets et actualisations sans repousser son échéance", () => {
    const restored = readSessionLifetime(JSON.stringify(record));
    assert.deepEqual(restored, record);
    if (!restored) throw new Error("Missing record");
    assert.equal(sessionMustEnd(restored, "viewer", "browser", 2000), false);
    assert.equal(sessionMustEnd(restored, "viewer", "browser", 3_601_000), true);
  });
  it("ne change pas le niveau Écriture non concerné par la demande", () => {
    assert.equal(sessionDuration("editor"), null);
    assert.equal(sessionMustEnd(record, "editor", null, 100_000_000), false);
  });
});