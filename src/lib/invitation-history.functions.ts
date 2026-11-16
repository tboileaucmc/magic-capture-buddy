import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getInvitationHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ page: z.number().int().min(0).max(10000), status: z.enum(["all", "pending", "sent", "failed"]) }).parse(value))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Accès réservé aux super administrateurs");
    let query = context.supabase.from("invitation_sends").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id", { ascending: false }).range(data.page * 50, data.page * 50 + 49);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error, count } = await query;
    if (error) throw new Error("Le suivi des invitations est indisponible");
    return { rows: rows ?? [], count: count ?? 0 };
  });