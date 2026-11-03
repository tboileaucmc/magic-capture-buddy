import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cancelCalendarMission, missionEventId } from "./calendar-cancellation.server";

describe("Mission calendar cancellation", () => {
  test("annule uniquement l’instance sélectionnée sans rappel et notifie ses invités", async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    await cancelCalendarMission("series--2026-11-06", "test", "test", async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? "", body: init?.body ? JSON.parse(String(init.body)) : null });
      return new Response(null, { status: 204 });
    }, "google-instance-id");
    assert.equal(calls.length, 2);
    assert.ok(calls.every((c) => c.url.includes("/events/google-instance-id?")));
    assert.deepEqual(calls[0].body, { reminders: { useDefault: false, overrides: [] } });
    assert.equal(calls[1].method, "DELETE");
    assert.ok(calls[1].url.endsWith("sendUpdates=all"));
  });
  test("deletes the same event and notifies every technician", async () => {
    let url = "";
    let method = "";
    const request: typeof fetch = async (input, init) => {
      url = String(input);
      method = init?.method ?? "";
      return new Response(null, { status: 204 });
    };
    await cancelCalendarMission("mission-123", "test", "test", request);
    assert.equal(method, "DELETE");
    assert.equal(missionEventId("mission-123"), "m6d697373696f6e2d313233");
    assert.equal(url, "https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events/m6d697373696f6e2d313233?sendUpdates=all");
  });
  test("accepts missions never sent or already cancelled", async () => {
    for (const status of [404, 410]) {
      assert.equal(await cancelCalendarMission("mission", "test", "test", async () => new Response(null, { status })), undefined);
    }
  });
  test("does not allow planning deletion after a provider failure", async () => {
    await assert.rejects(cancelCalendarMission("mission", "test", "test", async (_input, init) => new Response("Unavailable", { status: init?.method === "PATCH" ? 200 : 503 })), /\[503\]/);
  });
  test("removes automatic and default reminders before notifying attendees of cancellation", async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    await cancelCalendarMission("mission", "test", "test", async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? "", body: init?.body ? JSON.parse(String(init.body)) : null });
      return new Response(null, { status: 204 });
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.method, "PATCH");
    assert.equal(calls[0]?.url.endsWith("?sendUpdates=none"), true);
    assert.deepEqual(calls[0]?.body, { reminders: { useDefault: false, overrides: [] } });
    assert.equal(calls[1]?.method, "DELETE");
    assert.equal(calls[1]?.url.endsWith("?sendUpdates=all"), true);
  });
  test("preserves the mission for retry if reminder removal fails", async () => {
    let calls = 0;
    await assert.rejects(cancelCalendarMission("mission", "test", "test", async () => {
      calls++;
      return new Response(null, { status: 503 });
    }), /Suppression du rappel échouée/);
    assert.equal(calls, 1);
  });
});