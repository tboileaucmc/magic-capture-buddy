import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Envoi manuel (bouton) : lit le planning et la liste en ligne, génère le PDF et l'envoie. */
export const sendPlanningPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCanEdit } = await import("./roles.server");
    await assertCanEdit(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("planning_state").select("data, broadcast_list").eq("id", "main").single();
    if (error) throw new Error(error.message);
    const { sendPlanningMail } = await import("./planning-mail.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sendPlanningMail(row.data as any, row.broadcast_list ?? []);
  });
