import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldSendWeeklyPlanning } from "./planning-mail-schedule";

test("Ascension: envoi mercredi à 17 h Paris en heure d’été", () => {
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-05-13T15:00:20Z")), true);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-05-13T16:00:00Z")), false);
});

test("jeudi férié : aucun second envoi le jeudi", () => {
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-05-14T12:00:00Z")), false);
});

test("Nouvel An : envoi la veille à 17 h Paris en heure d’hiver", () => {
  assert.equal(shouldSendWeeklyPlanning(new Date("2025-12-31T16:00:25Z")), true);
  assert.equal(shouldSendWeeklyPlanning(new Date("2025-12-31T15:00:00Z")), false);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-01-01T13:00:00Z")), false);
});

test("semaine ordinaire : jeudi 14 h conservé, pas d’envoi mercredi", () => {
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-11-04T16:00:00Z")), false);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-11-05T13:00:00Z")), true);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-11-05T12:00:00Z")), false);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-07-09T12:00:00Z")), true);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-07-09T13:00:00Z")), false);
});

test("un mercredi férié seul ne déplace pas l’envoi du jeudi", () => {
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-11-11T16:00:00Z")), false);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-11-12T13:00:00Z")), true);
});

test("aucun envoi les autres jours même à 17 h", () => {
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-05-12T15:00:00Z")), false);
  assert.equal(shouldSendWeeklyPlanning(new Date("2026-05-15T15:00:00Z")), false);
});