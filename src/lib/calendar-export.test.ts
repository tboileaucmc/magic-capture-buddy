import { describe, expect, it } from "vitest";
import { buildDescription, buildHtmlDescription, buildICS, googlePayload, normalizeTeamsUrl } from "./calendar-export";
import type { Assignment } from "./planning-types";

const teamsUrl = "https://teams.microsoft.com/l/meetup-join/mission?context=test";
const mission: Assignment = {
  id: "teams-test", technicianIds: ["tech"], dateISO: "2026-10-29", half: "AM",
  categoryId: "chantier", title: "AFF test", address: "", startTime: "08:00", endTime: "12:00", teamsUrl,
};

describe("Liens de réunion Teams", () => {
  it("accepte les liens HTTPS Microsoft Teams et refuse les autres destinations", () => {
    expect(normalizeTeamsUrl(` ${teamsUrl} `)).toBe(teamsUrl);
    expect(normalizeTeamsUrl("https://teams.live.com/meet/123")).toBe("https://teams.live.com/meet/123");
    expect(normalizeTeamsUrl("https://teams.cloud.microsoft/meet/123")).toBe("https://teams.cloud.microsoft/meet/123");
    for (const url of ["javascript:alert(1)", "http://teams.microsoft.com/meet", "https://teams.microsoft.com.evil.example/meet", "https://user:pass@teams.microsoft.com/meet", "not a url"]) {
      expect(normalizeTeamsUrl(url)).toBeUndefined();
    }
  });
  it("inclut le lien dans les invitations et les exports de mission confirmée", () => {
    expect(buildDescription(mission)).toContain(teamsUrl);
    expect(buildICS(mission, [])).toContain(teamsUrl);
    expect(buildHtmlDescription(mission)).toContain(`href="${teamsUrl}"`);
    expect(googlePayload(mission, []).description).toContain(teamsUrl);
  });
  it("masque le lien Teams dans tous les exports lorsque la mission est à confirmer", () => {
    const provisional = { ...mission, toConfirm: true };
    expect(buildDescription(provisional)).not.toContain(teamsUrl);
    expect(buildICS(provisional, [])).not.toContain(teamsUrl);
    expect(buildHtmlDescription(provisional)).not.toContain(teamsUrl);
    expect(googlePayload(provisional, []).description).not.toContain(teamsUrl);
  });
});