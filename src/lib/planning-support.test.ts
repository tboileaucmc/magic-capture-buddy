import { test, expect } from "vitest";
import { supportTechnicianIds, isSupportOnly } from "./planning-support";

const techs = [
  { id: "a", name: "VANDENDRIESCH Alain" },
  { id: "f", name: "BRABANT François" },
  { id: "h", name: "CARAYON Hugo" },
];

test("support starts at BRABANT", () => {
  expect([...supportTechnicianIds(techs)]).toEqual(["f", "h"]);
});

test("mission mixing support and non-support is refused", () => {
  const s = supportTechnicianIds(techs);
  expect(isSupportOnly(["f", "h"], s)).toBe(true);
  expect(isSupportOnly(["f", "a"], s)).toBe(false);
});
