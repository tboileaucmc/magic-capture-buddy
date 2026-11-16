import { test } from "node:test";
import assert from "node:assert/strict";
import { isInvitationAdministrator } from "./invitation-status";
test("only super administrators can access invitation history", () => {
  assert.equal(isInvitationAdministrator("admin"), true);
  for (const role of ["editor", "support_editor", "viewer", null]) assert.equal(isInvitationAdministrator(role), false);
});