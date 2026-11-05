import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDescription, buildHtmlDescription, buildICS, googlePayload, normalizeTeamsUrl } from "./calendar-export";
import type { Assignment } from "./planning-types";

const teamsUrl = "https://teams.microsoft.com/l/meetup-join/mission?context=test";
const mission: Assignment = {
  id: "teams-test", technicianIds: ["tech"], dateISO: "2026-10-29", half: "AM",
  categoryId: "chantier", title: "AFF test", address: "", startTime: "08:00", endTime: "12:00", teamsUrl,
};

it("uses the public Waze launch page in every invitation format", () => {
  const a = { ...mission, address: "12 rue de Paris, Lyon" };
  const url = "https://planning.cinemeccanica-france.fr/waze?address=12%20rue%20de%20Paris%2C%20Lyon";
  assert.ok(buildDescription(a).includes(url));
  assert.ok(buildHtmlDescription(a).includes(`href="${url}"`));
  assert.ok(buildICS(a, []).includes(url));
  assert.ok(googlePayload(a, []).description.includes(url));
  assert.ok(!buildDescription({ ...a, toConfirm: true }).includes(url));
});

describe("Liens de réunion Teams", () => {
  it("accepte les liens HTTPS Microsoft Teams et refuse les autres destinations", () => {
    assert.equal(normalizeTeamsUrl(` ${teamsUrl} `), teamsUrl);
    assert.equal(normalizeTeamsUrl("https://teams.live.com/meet/123"), "https://teams.live.com/meet/123");
    assert.equal(normalizeTeamsUrl("https://teams.cloud.microsoft/meet/123"), "https://teams.cloud.microsoft/meet/123");
    for (const url of ["javascript:alert(1)", "http://teams.microsoft.com/meet", "https://teams.microsoft.com.evil.example/meet", "https://user:pass@teams.microsoft.com/meet", "not a url"]) {
      assert.equal(normalizeTeamsUrl(url), undefined);
    }
  });
  it("inclut le lien dans les invitations et les exports de mission confirmée", () => {
    assert.ok(buildDescription(mission).includes(teamsUrl));
    assert.ok(buildICS(mission, []).includes(teamsUrl));
    assert.ok(buildHtmlDescription(mission).includes(`href="${teamsUrl}"`));
    assert.ok(googlePayload(mission, []).description.includes(teamsUrl));
  });
  it("masque le lien Teams dans tous les exports lorsque la mission est à confirmer", () => {
    const provisional = { ...mission, toConfirm: true };
    assert.ok(!buildDescription(provisional).includes(teamsUrl));
    assert.ok(!buildICS(provisional, []).includes(teamsUrl));
    assert.ok(!buildHtmlDescription(provisional).includes(teamsUrl));
    assert.ok(!googlePayload(provisional, []).description.includes(teamsUrl));
  });
});
it("télétravail visible dans la notification", () => {
  const a = { id: "r", technicianIds: [], dateISO: "2026-11-02", half: "AM", categoryId: "n", title: "SUPPORT", address: "", startTime: "08:00", endTime: "17:00", remote: true } as never;
  assert.match(googlePayload(a, []).title, /Télétravail/);
  assert.match(buildHtmlDescription(a), /Télétravail/);
});

it("transmet les prénoms et noms aux invités sans changer leurs adresses", () => {
  const techs = [
    { id: "eric", name: "GERNIGON Eric", email: "eric@example.com" },
    { id: "victor", name: "CUNHA Victor", email: "victor@example.com" },
    { id: "invalid", name: "Sans email", email: "" },
  ];
  assert.deepEqual(googlePayload(mission, techs).attendees, [
    { email: "eric@example.com", displayName: "Eric GERNIGON" },
    { email: "victor@example.com", displayName: "Victor CUNHA" },
  ]);
});
