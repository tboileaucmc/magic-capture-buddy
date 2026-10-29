import { test } from "node:test";
import assert from "node:assert/strict";
import { supportTechnicianIds, isSupportOnly } from "./planning-support";

const techs = [
  { id: "a", name: "VANDENDRIESCH Alain" },
  { id: "f", name: "BRABANT François" },
  { id: "h", name: "CARAYON Hugo" },
];

test("support starts at BRABANT", () => {
  assert.deepEqual([...supportTechnicianIds(techs)], ["f", "h"]);
});

test("mission mixing support and non-support is refused", () => {
  const s = supportTechnicianIds(techs);
  assert.equal(isSupportOnly(["f", "h"], s), true);
  assert.equal(isSupportOnly(["f", "a"], s), false);
});
