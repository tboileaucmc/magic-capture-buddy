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

import { defaultSupportCategoryId } from "./planning-support";
const cats = [{ id: "a", label: "Affaires" }, { id: "n", label: "NOC" }];
const sup = new Set(["s1"]);
test("NOC par défaut en semaine pour le support", () => {
  assert.equal(defaultSupportCategoryId(cats, "s1", sup, "weekday"), "n");
});
test("pas de NOC le week-end, les jours fériés ni hors support", () => {
  assert.equal(defaultSupportCategoryId(cats, "s1", sup, "weekend"), undefined);
  assert.equal(defaultSupportCategoryId(cats, "s1", sup, "holiday"), undefined);
  assert.equal(defaultSupportCategoryId(cats, "x", sup, "weekday"), undefined);
});
