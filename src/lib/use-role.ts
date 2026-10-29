import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "editor" | "support_editor" | "viewer";

/** Rôle du compte connecté : admin, editor, support_editor (missions du support seulement) ou viewer. */
export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setRole("viewer");
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const roles = (data ?? []).map((r) => r.role as string);
      setRole(roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : roles.includes("support_editor") ? "support_editor" : "viewer");
    })();
  }, []);
  return { role, canEdit: role === "admin" || role === "editor", isSupportEditor: role === "support_editor", isAdmin: role === "admin" };
}
