import { it } from "node:test";
import assert from "node:assert/strict";
import { buildPlanningPdf } from "./planning-pdf";
import { buildDescription, buildHtmlDescription, buildICS, googlePayload, googleCalendarUrl, outlookCalendarUrl, mailtoUrl } from "./calendar-export";
import type { Assignment } from "./planning-types";

const mission: Assignment = {
  id: "privacy-test", technicianIds: ["tech"], dateISO: "2026-11-02", half: "AM",
  categoryId: "chantier", title: "Mission publique", address: "", startTime: "08:00", endTime: "12:00",
};

for (const field of ["trainings", "fuel_card", "btp_card"]) {
  it(`excludes confidential ${field} data from PDF and all invitation exports`, () => {
    const marker = `CONFIDENTIAL_${field}_123456`;
    const technician = { id: "tech", name: "Technicien", email: "tech@example.com", [field]: marker };
    const input = { ...mission, [field]: marker };
    const pdf = Buffer.from(buildPlanningPdf({ technicians: [technician], categories: [], assignments: [input] }, new Date("2026-11-02T00:00:00Z"), 7), "base64").toString("latin1");
    assert.ok(pdf.startsWith("%PDF"));
    assert.ok(pdf.includes("Technicien"));
    assert.ok(!pdf.includes(marker));
    const exports = [buildDescription(input), buildHtmlDescription(input), buildICS(input, [technician]), JSON.stringify(googlePayload(input, [technician])), googleCalendarUrl(input, [technician]), outlookCalendarUrl(input, [technician]), mailtoUrl(input, [technician])];
    for (const output of exports) assert.ok(!output.includes(marker), `${field} leaked in export`);
  });
}

it("PDF shows NOC in free support slots without replacing an occupied slot", () => {
  const noc = { id: "noc", label: "NOC", color: "#f59e0b" };
  const data = {
    technicians: [{ id: "tech", name: "BRABANT François", email: "tech@example.com" }],
    categories: [noc], assignments: [mission],
  };
  const before = JSON.stringify(data);
  const pdf = Buffer.from(buildPlanningPdf(data, new Date("2026-11-02T00:00:00Z"), 7), "base64").toString("latin1");
  // Thirteen free half-days plus the category legend, but not the occupied Monday morning.
  assert.equal((pdf.match(/\(NOC\)/g) ?? []).length, 14);
  assert.ok(pdf.includes("Mission publique"));
  assert.equal(JSON.stringify(data), before);
});