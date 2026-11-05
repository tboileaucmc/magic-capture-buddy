import { test } from "node:test";
import assert from "node:assert/strict";
import { filterPlanningTechnicians, technicianSection } from "./planning-regions";

const technicians = [
  { name: "VANDENDRIESCH Alain" },
  { name: "GERNIGON Éric" },
  { name: "Ouest collègue" },
  { name: "CUNHA Victor" },
  { name: "Est collègue" },
  { name: "DAVID Michael" },
  { name: "Paris collègue" },
  { name: "BRABANT François" },
  { name: "CARAYON Hugo" },
  { name: "Nabil" },
  { name: "Amaury" },
];

test("region filters start at their named technician and stop at the next divider", () => {
  assert.deepEqual(filterPlanningTechnicians(technicians, "west"), technicians.slice(1, 3));
  assert.deepEqual(filterPlanningTechnicians(technicians, "east"), technicians.slice(3, 5));
  assert.deepEqual(filterPlanningTechnicians(technicians, "paris"), technicians.slice(5, 7));
});

test("support includes all four technicians, and all restores even ungrouped technicians", () => {
  assert.deepEqual(filterPlanningTechnicians(technicians, "support"), technicians.slice(7));
  assert.deepEqual(filterPlanningTechnicians(technicians, "all"), technicians);
});

test("accented and alternate first names preserve the existing boundaries", () => {
  assert.equal(technicianSection("Éric Gernigon"), "west");
  assert.equal(technicianSection("Mickaël David"), "paris");
  assert.deepEqual(filterPlanningTechnicians([], "support"), []);
});