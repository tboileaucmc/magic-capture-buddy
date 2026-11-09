import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((v) => v.from <= v.to, "Période invalide");

export type AnomalyReport = { text: string; changeCount: number; truncated: boolean };

/** Admin-only: asks the AI model to flag unusual mission/recipient changes over a period. */
export const analyzePlanningAnomalies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => input.parse(v))
  .handler(async ({ data, context }): Promise<AnomalyReport> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Analyse réservée aux super utilisateurs");
    const LIMIT = 400;
    const { data: rows, error } = await context.supabase
      .from("mission_history")
      .select("created_at, action, title, technicians, date_iso, user_email")
      .gte("created_at", `${data.from}T00:00:00Z`)
      .lte("created_at", `${data.to}T23:59:59Z`)
      .order("created_at", { ascending: true })
      .limit(LIMIT + 1);
    if (error) throw new Error(error.message);
    const { data: state } = await context.supabase.from("planning_state").select("broadcast_list").eq("id", "main").maybeSingle();
    const history = (rows ?? []).slice(0, LIMIT);
    if (history.length === 0) return { text: "Aucune modification enregistrée sur cette période.", changeCount: 0, truncated: false };
    const lines = history.map((r) => [r.created_at.slice(0, 16), r.action, r.title ?? "", r.technicians ?? "", r.date_iso ?? "", r.user_email ?? ""].join(" | "));
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "Tu es un auditeur du planning des techniciens Cinemeccanica. Réponds en français, en liste courte. Signale uniquement les changements inhabituels : volume anormal de suppressions ou modifications, modifications en dehors des heures de bureau, un même utilisateur effectuant des changements massifs, missions modifiées de nombreuses fois, destinataires de diffusion suspects (domaines externes inconnus, adresses étranges). Pour chaque point, cite dates, missions et utilisateurs. Si rien n'est inhabituel, dis-le clairement. N'invente rien.",
        input: `Période du ${data.from} au ${data.to}.\nDestinataires actuels de la diffusion du planning : ${(state?.broadcast_list ?? []).join(", ") || "aucun"}.\nHistorique (date UTC | action | mission | techniciens | jour | auteur) :\n${lines.join("\n")}`,
      });
      const text = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : c.type === "refusal" ? c.refusal : ""))
        .join("\n").trim();
      return { text: text || "Le modèle n'a pas renvoyé d'analyse.", changeCount: history.length, truncated: (rows ?? []).length > LIMIT };
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("anomaly analysis failed", e.code, e.ids);
        if (e.httpStatus === 402) throw new Error("Crédits d'IA épuisés, analyse indisponible");
        if (e.httpStatus === 429) throw new Error("Trop de demandes, réessayez dans quelques minutes");
        throw new Error("Analyse indisponible pour le moment");
      }
      throw e;
    }
  });
