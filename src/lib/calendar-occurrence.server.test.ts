import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calendarOccurrenceId } from "./calendar-occurrence.server";
import { missionEventId } from "./calendar-cancellation.server";

describe("Single recurring Calendar meeting", () => {
  it("targets the original Friday at 15:30 even when the meeting was moved", async () => {
    let url = "";
    const id = await calendarOccurrenceId({ seriesId: "series", dateISO: "2026-11-06", startTime: "15:30" }, {}, async (input) => {
      url = String(input);
      return Response.json({ items: [{ id: "wrong", recurringEventId: "other", originalStartTime: { dateTime: "2026-11-06T15:30:00+01:00" } }, { id: "instance", recurringEventId: missionEventId("series"), originalStartTime: { dateTime: "2026-11-06T14:30:00Z" }, start: { dateTime: "2026-12-10T16:00:00+01:00" } }] });
    });
    assert.equal(id, "instance");
    assert.equal(new URL(url).searchParams.get("originalStart"), "2026-11-06T15:30:00+01:00");
    assert.equal(new URL(url).searchParams.has("timeMin"), false);
  });
  it("uses the Paris summer offset and follows pagination", async () => {
    let calls = 0;
    await calendarOccurrenceId({ seriesId: "series", dateISO: "2027-07-02", startTime: "15:30" }, {}, async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("originalStart"), "2027-07-02T15:30:00+02:00");
      calls++;
      if (calls === 1) return Response.json({ items: [], nextPageToken: "next" });
      assert.equal(url.searchParams.get("pageToken"), "next");
      return Response.json({ items: [{ id: "instance", recurringEventId: missionEventId("series"), originalStartTime: { dateTime: "2027-07-02T13:30:00Z" } }] });
    });
    assert.equal(calls, 2);
  });
  it("refuses missing occurrences and exposes provider errors without creating a new invitation", async () => {
    await assert.rejects(calendarOccurrenceId({ seriesId: "s", dateISO: "2026-11-06", startTime: "15:30" }, {}, async () => Response.json({ items: [] })), /introuvable/);
    await assert.rejects(calendarOccurrenceId({ seriesId: "s", dateISO: "2026-11-06", startTime: "15:30" }, {}, async () => new Response("unavailable", { status: 503 })), /\[503\].*unavailable/);
  });
});