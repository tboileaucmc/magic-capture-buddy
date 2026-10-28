import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlanningDate } from "./planning-date";

test("accepts a complete date typed into the planning navigation", () => {
  const date = parsePlanningDate("2026-11-12");
  assert.equal(date?.getFullYear(), 2026);
  assert.equal(date?.getMonth(), 10);
  assert.equal(date?.getDate(), 12);
});

test("does not navigate while the year or date is incomplete", () => {
  for (const value of ["", "2026-", "2026-11-", "0002-11-12"]) {
    assert.equal(parsePlanningDate(value), undefined);
  }
});

test("rejects impossible calendar dates", () => {
  assert.equal(parsePlanningDate("2026-02-30"), undefined);
});