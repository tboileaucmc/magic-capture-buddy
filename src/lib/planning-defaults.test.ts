import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSupportCategory } from "./planning-defaults";
import { supportTechnicianIds } from "./planning-support";

const techs = [
  { id: "other", name: "BOILEAU Thomas" },
  { id: "f", name: "BRABANT François" },
  { id: "h", name: "CARAYON Hugo" },
  { id: "n", name: "DENDANE Nabil" },
  { id: "a", name: "MOULIN Amaury" },
];
const support = supportTechnicianIds(techs);
const noc = { id: "noc", label: "NOC", color: "#f59e0b" };

test("Noc fills all fourteen free half-days each week for the four support people", () => {
  for (const id of ["f", "h", "n", "a"]) {
    for (let slot = 0; slot < 14; slot++) assert.equal(defaultSupportCategory(id, support, [noc]), noc);
  }
  assert.equal(defaultSupportCategory("other", support, [noc]), undefined);
});

test("existing missions always override Noc", () => {
  assert.equal(defaultSupportCategory("f", support, [noc], true), undefined);
});

test("missing Noc category has no fallback and input data is unchanged", () => {
  const categories = [noc];
  const before = JSON.stringify(categories);
  assert.equal(defaultSupportCategory("f", support, []), undefined);
  defaultSupportCategory("f", support, categories);
  assert.equal(JSON.stringify(categories), before);
});