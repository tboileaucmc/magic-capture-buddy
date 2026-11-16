import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "./use-role";
import { BROWSER_SESSION_COOKIE, SESSION_POLICY_KEY, readSessionLifetime, sessionDuration, sessionMustEnd } from "./session-lifetime";

let roleCache: { userId: string; role: Role; until: number } | undefined;
let ending: Promise<void> | undefined;

// session_id is stable across automatic token renewals; iat is not.
function sessionId(session: Session): string {
  try {
    const payload = session.access_token.split(".")[1];
    if (!payload) throw new Error("Missing payload");
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof claims.session_id === "string") return `${session.user.id}:${claims.session_id}`;
  } catch { /* Older providers may not include session_id. */ }
  return session.user.id;
}

function browserId(): string | null {
  return document.cookie.split("; ").find(value => value.startsWith(`${BROWSER_SESSION_COOKIE}=`))?.split("=")[1] ?? null;
}

export function registerSessionLifetime(session: Session) {
  const id = browserId() ?? crypto.randomUUID();
  // No Expires/Max-Age: shared by tabs but normally discarded when the browser closes.
  document.cookie = `${BROWSER_SESSION_COOKIE}=${id}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  localStorage.setItem(SESSION_POLICY_KEY, JSON.stringify({ sessionId: sessionId(session), startedAt: Date.now(), browserId: id }));
  roleCache = undefined;
}

async function currentRole(userId: string): Promise<Role> {
  if (roleCache?.userId === userId && roleCache.until > Date.now()) return roleCache.role;
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Impossible de vérifier la durée de connexion. Réessayez.");
  const roles = (data ?? []).map(row => row.role);
  const role: Role = roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : roles.includes("support_editor") ? "support_editor" : "viewer";
  roleCache = { userId, role, until: Date.now() + 60_000 };
  return role;
}

export async function checkSessionLifetime(): Promise<{ allowed: boolean; remaining: number | null }> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { allowed: false, remaining: null };
  const session = data.session;
  const role = await currentRole(session.user.id);
  let record = readSessionLifetime(localStorage.getItem(SESSION_POLICY_KEY));
  if (!record || record.sessionId !== sessionId(session)) {
    // Existing connections get their first deadline when this policy is deployed.
    registerSessionLifetime(session);
    record = readSessionLifetime(localStorage.getItem(SESSION_POLICY_KEY));
  }
  if (!record) throw new Error("Le navigateur ne permet pas de sécuriser la durée de connexion.");
  if (sessionMustEnd(record, role, browserId(), Date.now())) {
    if (!ending) ending = supabase.auth.signOut({ scope: "local" }).then(({ error }) => {
      if (error) throw error;
    }).finally(() => { ending = undefined; });
    // Keep the expired marker if logout fails, so reload cannot revive access.
    try { await ending; } catch { /* Access remains blocked by the expired policy. */ }
    return { allowed: false, remaining: 0 };
  }
  const duration = sessionDuration(role);
  return { allowed: true, remaining: duration === null ? null : Math.max(0, record.startedAt + duration - Date.now()) };
}

export function watchSessionLifetime(onExpired: () => void): () => void {
  let stopped = false;
  let checking = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = async () => {
    if (stopped || checking) return;
    checking = true;
    try {
      const result = await checkSessionLifetime();
      if (stopped) return;
      if (!result.allowed) onExpired();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void check(), Math.max(1, Math.min(result.remaining ?? 60_000, 60_000)));
      if (!result.allowed) { clearTimeout(timer); timer = undefined; }
    } catch {
      if (!stopped) timer = setTimeout(() => void check(), 10_000);
    } finally { checking = false; }
  };
  const wake = () => { if (document.visibilityState === "visible") void check(); };
  const storage = (event: StorageEvent) => { if (event.key === SESSION_POLICY_KEY) void check(); };
  // Defer auth callbacks: calling auth APIs inside them can deadlock the auth lock.
  const { data } = supabase.auth.onAuthStateChange(() => { if (timer) clearTimeout(timer); timer = setTimeout(() => void check(), 0); });
  window.addEventListener("focus", wake);
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("storage", storage);
  void check();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    data.subscription.unsubscribe();
    window.removeEventListener("focus", wake);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("storage", storage);
  };
}