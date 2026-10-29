import { test } from "node:test";
import assert from "node:assert/strict";
import { duplicateWeek } from "./planning-duplicate.ts";
import type { Assignment } from "./planning-types.ts";

const base = (o: Partial<Assignment>): Assignment => ({
  id: "x", technicianIds: ["t1"], dateISO: "2026-11-02", half: "AM", categoryId: "c",
  title: "M", address: "", startTime: "08:00", endTime: "12:00", ...o,
});

test("copies the week's missions shifted by the gap, with new ids", () => {
  let n = 0;
  const out = duplicateWeek(
    [base({ id: "a", dateISO: "2026-11-04", endDateISO: "2026-11-05", meetUrl: "https://meet" }), base({ id: "b", dateISO: "2026-11-09" })],
    "2026-11-02", "2026-11-09", () => true, () => `n${++n}`,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "n1");
  assert.equal(out[0].dateISO, "2026-11-11");
  assert.equal(out[0].endDateISO, "2026-11-12");
  assert.equal(out[0].meetUrl, undefined);
});

test("skips weekly series and missions the user cannot write", () => {
  const out = duplicateWeek(
    [base({ id: "w", recurrence: "weekly" }), base({ id: "o", technicianIds: ["other"] }), base({ id: "s", technicianIds: ["t1"] })],
    "2026-11-02", "2026-11-16", (a) => a.technicianIds.every((t) => t === "t1"), () => "new",
  );
  assert.deepEqual(out.map((a) => a.dateISO), ["2026-11-16"]);
});
