import { test } from "node:test";
import assert from "node:assert/strict";
import { frenchHolidayName, planningDayKind } from "./planning-day";

test("Saturday and Sunday are weekends; ordinary Monday is a weekday", () => {
  assert.equal(planningDayKind(new Date(2026, 9, 24)), "weekend");
  assert.equal(planningDayKind(new Date(2026, 9, 25)), "weekend");
  assert.equal(planningDayKind(new Date(2026, 9, 26)), "weekday");
});

test("recognizes all eight fixed national French holidays", () => {
  for (const [month, day] of [[1, 1], [5, 1], [5, 8], [7, 14], [8, 15], [11, 1], [11, 11], [12, 25]]) {
    assert.equal(planningDayKind(new Date(2026, month - 1, day)), "holiday");
  }
  assert.equal(frenchHolidayName(new Date(2026, 10, 11)), "Armistice");
});

test("recognizes movable holidays in different years", () => {
  assert.equal(frenchHolidayName(new Date(2026, 3, 6)), "Lundi de Pâques");
  assert.equal(frenchHolidayName(new Date(2026, 4, 14)), "Ascension");
  assert.equal(frenchHolidayName(new Date(2026, 4, 25)), "Lundi de Pentecôte");
  assert.equal(frenchHolidayName(new Date(2027, 2, 29)), "Lundi de Pâques");
  assert.equal(frenchHolidayName(new Date(2027, 4, 6)), "Ascension");
  assert.equal(frenchHolidayName(new Date(2027, 4, 17)), "Lundi de Pentecôte");
  assert.equal(frenchHolidayName(new Date(2026, 3, 7)), undefined);
});

test("a holiday takes precedence when it falls on a weekend", () => {
  assert.equal(planningDayKind(new Date(2026, 10, 1)), "holiday");
});