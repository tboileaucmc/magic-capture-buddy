import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "editor" | "viewer";

/** Rôle du compte connecté : admin (super utilisateur), editor (écriture) ou viewer (lecture). */
export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setRole("viewer");
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const roles = (data ?? []).map((r) => r.role);
      setRole(roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : "viewer");
    })();
  }, []);
  return { role, canEdit: role === "admin" || role === "editor", isAdmin: role === "admin" };
}
