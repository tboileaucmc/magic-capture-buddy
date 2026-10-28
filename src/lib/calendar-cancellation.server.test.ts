import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cancelCalendarMission, missionEventId } from "./calendar-cancellation.server";

describe("Mission calendar cancellation", () => {
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
    await assert.rejects(cancelCalendarMission("mission", "test", "test", async () => new Response("Unavailable", { status: 503 })), /\[503\]/);
  });
});