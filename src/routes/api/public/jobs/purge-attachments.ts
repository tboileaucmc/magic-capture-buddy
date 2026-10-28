import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const DRIVE = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

/** Supprime (corbeille) les pièces jointes du planning ajoutées il y a plus de 3 mois. */
export const Route = createFileRoute("/api/public/jobs/purge-attachments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const lovableKey = process.env.LOVABLE_API_KEY;
        const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
        if (!lovableKey || !driveKey) return Response.json({ error: "Drive non connecté" }, { status: 500 });
        const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey, "Content-Type": "application/json" };
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 3);
        const q = `appProperties has { key='planningAttachment' and value='1' } and createdTime < '${cutoff.toISOString()}' and trashed = false`;
        let pageToken: string | undefined;
        let purged = 0;
        const errors: string[] = [];
        do {
          const params = new URLSearchParams({ q, fields: "nextPageToken,files(id)", pageSize: "200" });
          if (pageToken) params.set("pageToken", pageToken);
          const res = await fetch(`${DRIVE}/files?${params}`, { headers });
          if (!res.ok) {
            const t = await res.text();
            console.error(`Drive list [${res.status}]: ${t}`);
            return Response.json({ error: `Drive [${res.status}]: ${t.slice(0, 300)}`, purged }, { status: 502 });
          }
          const body = (await res.json()) as { nextPageToken?: string; files: { id: string }[] };
          for (const f of body.files ?? []) {
            const del = await fetch(`${DRIVE}/files/${f.id}`, { method: "PATCH", headers, body: JSON.stringify({ trashed: true }) });
            if (del.ok) purged++;
            else errors.push(`${f.id}: ${del.status}`);
          }
          pageToken = body.nextPageToken;
        } while (pageToken);
        return Response.json({ success: true, purged, errors });
      },
    },
  },
});
