import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluatePlanningPassword } from "./planning-password";

describe("strong passwords for new planning accounts", () => {
  it("rejects common passwords even with uppercase, numbers and punctuation", () => {
    for (const password of ["Password123!", "Azerty123456!", "aaaaaaaaaaaaaaaaaaaa"]) {
      assert.equal(evaluatePlanningPassword(password).accepted, false);
    }
  });
  it("requires at least 12 characters", () => {
    assert.equal(evaluatePlanningPassword("K9!vQ2#rZ7@").accepted, false);
  });
  it("accepts a strong random password with at least 50 estimated bits", () => {
    const result = evaluatePlanningPassword("K9!vQ2#rZ7@tM4$xW8%p");
    assert.equal(result.accepted, true);
    assert.ok(result.entropyBits >= 50);
  });
  it("accepts a long passphrase without imposing character classes", () => {
    assert.equal(evaluatePlanningPassword("velours cyclone cactus satellite moisson").accepted, true);
  });
  it("discounts company and email-related words", () => {
    assert.equal(evaluatePlanningPassword("Cinemeccanica2026!", "thomas@cinemeccanica.fr").accepted, false);
    assert.ok(evaluatePlanningPassword("ThomasBoileau2026!", "thomas.boileau@cinemeccanica.fr").entropyBits
      < evaluatePlanningPassword("ThomasBoileau2026!").entropyBits);
  });
  it("bounds analysis and rejects passwords longer than 128 characters", () => {
    assert.equal(evaluatePlanningPassword("x".repeat(129)).accepted, false);
  });
});