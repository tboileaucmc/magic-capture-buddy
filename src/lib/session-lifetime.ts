import type { Role } from "./use-role";

export const SESSION_POLICY_KEY = "cmc-session-lifetime-v1";
export const BROWSER_SESSION_COOKIE = "cmc-browser-session";
export type SessionLifetime = { sessionId: string; startedAt: number; browserId: string };

export function sessionDuration(role: Role): number | null {
  if (role === "viewer") return 60 * 60 * 1000;
  if (role === "admin" || role === "support_editor") return 8 * 60 * 60 * 1000;
  return null;
}

export function sessionMustEnd(record: SessionLifetime, role: Role, browserId: string | null, now: number): boolean {
  const duration = sessionDuration(role);
  return (role === "viewer" && record.browserId !== browserId)
    || (duration !== null && (now - record.startedAt >= duration || now < record.startedAt));
}

export function readSessionLifetime(value: string | null): SessionLifetime | null {
  try {
    const record = JSON.parse(value ?? "null");
    return record && typeof record.sessionId === "string" && typeof record.browserId === "string"
      && Number.isFinite(record.startedAt) ? record : null;
  } catch { return null; }
}