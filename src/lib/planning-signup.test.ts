import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPlanningSignupEmail } from "./planning-signup";

describe("planning signup domain", () => {
  it("accepts the exact @cinemeccanica.fr domain, ignoring case and outer spaces", () => {
    assert.equal(isPlanningSignupEmail("thomas@cinemeccanica.fr"), true);
    assert.equal(isPlanningSignupEmail(" Thomas@CINEMECCANICA.FR "), true);
  });
  it("rejects other domains, subdomains and misleading suffixes", () => {
    for (const email of ["thomas@gmail.com", "thomas@cinemeccanica-france.fr", "thomas@support.cinemeccanica.fr", "thomas@cinemeccanica.fr.example.com", "thomas@fakecinemeccanica.fr"]) {
      assert.equal(isPlanningSignupEmail(email), false);
    }
  });
  it("rejects missing or malformed email addresses", () => {
    for (const email of ["", "@cinemeccanica.fr", "thomas@@cinemeccanica.fr", "thomas boileau@cinemeccanica.fr"]) {
      assert.equal(isPlanningSignupEmail(email), false);
    }
  });
});