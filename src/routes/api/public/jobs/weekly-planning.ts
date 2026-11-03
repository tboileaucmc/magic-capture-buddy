import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { shouldSendWeeklyPlanning } from "@/lib/planning-mail-schedule";

/** Jeudi 14 h Paris, ou mercredi 17 h si le jeudi est férié. */
export const Route = createFileRoute("/api/public/jobs/weekly-planning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        // Les deux horaires UTC couvrent été/hiver ; le filtre évite le second envoi.
        if (!shouldSendWeeklyPlanning(new Date())) return Response.json({ skipped: "hors du créneau d’envoi hebdomadaire" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("planning_state").select("data, broadcast_list").eq("id", "main").maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!row || !row.broadcast_list?.length) return Response.json({ skipped: "liste vide" });
        const { sendPlanningMail } = await import("@/lib/planning-mail.server");
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = await sendPlanningMail(row.data as any, row.broadcast_list);
          return Response.json({ success: true, ...r });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
        }
      },
    },
  },
});
