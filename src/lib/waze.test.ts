import { test } from "node:test";
import assert from "node:assert/strict";
import { wazeAppUrl } from "./waze";

test("Android explicitly targets Waze with the mission address and navigation", () => {
  const url = wazeAppUrl("12 rue de Paris, Lyon", true);
  assert.ok(url.startsWith("intent://?q=12%20rue%20de%20Paris%2C%20Lyon&navigate=yes#Intent;scheme=waze;package=com.waze;"));
  assert.ok(url.includes("S.browser_fallback_url=https%3A%2F%2Fwaze.com%2Ful"));
});

test("other phones receive the native Waze navigation scheme", () => {
  assert.equal(wazeAppUrl("Paris", false), "waze://?q=Paris&navigate=yes");
});