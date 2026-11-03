import { test } from "node:test";
import assert from "node:assert/strict";
import { supportTechnicianIds, isSupportOnly } from "./planning-support";

const techs = [
  { id: "a", name: "VANDENDRIESCH Alain" },
  { id: "f", name: "BRABANT François" },
  { id: "h", name: "CARAYON Hugo" },
  { id: "n", name: "Nabil" },
  { id: "am", name: "Amaury" },
];

test("support starts at BRABANT", () => {
  assert.deepEqual([...supportTechnicianIds(techs)], ["f", "h", "n", "am"]);
});

test("mission mixing support and non-support is refused", () => {
  const s = supportTechnicianIds(techs);
  assert.equal(isSupportOnly(["f", "h"], s), true);
  assert.equal(isSupportOnly(["f", "a"], s), false);
});

test("Admin support can manage missions for each of François, Hugo, Nabil and Amaury", () => {
  const support = supportTechnicianIds(techs);
  for (const id of ["f", "h", "n", "am"]) assert.equal(isSupportOnly([id], support), true);
  assert.equal(isSupportOnly(["f", "h", "n", "am"], support), true);
});

test("Admin support cannot manage unassigned or non-support missions", () => {
  const support = supportTechnicianIds(techs);
  assert.equal(isSupportOnly([], support), false);
  assert.equal(isSupportOnly(["a"], support), false);
  assert.equal(isSupportOnly(["unknown"], support), false);
});

