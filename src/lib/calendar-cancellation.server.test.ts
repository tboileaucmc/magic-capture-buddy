import { describe, expect, test } from "bun:test";
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
    expect(method).toBe("DELETE");
    expect(missionEventId("mission-123")).toBe("m6d697373696f6e2d313233");
    expect(url).toBe("https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events/m6d697373696f6e2d313233?sendUpdates=all");
  });
  test("accepts missions never sent or already cancelled", async () => {
    for (const status of [404, 410]) {
      await expect(cancelCalendarMission("mission", "test", "test", async () => new Response(null, { status }))).resolves.toBeUndefined();
    }
  });
  test("does not allow planning deletion after a provider failure", async () => {
    await expect(cancelCalendarMission("mission", "test", "test", async () => new Response("Unavailable", { status: 503 }))).rejects.toThrow("[503]");
  });
});