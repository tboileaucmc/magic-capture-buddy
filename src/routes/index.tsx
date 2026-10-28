import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planning Techniciens — Cinemeccanica" },
      { name: "description", content: "Planning des techniciens Cinemeccanica : missions, agendas et envoi hebdomadaire." },
      { property: "og:title", content: "Planning Techniciens — Cinemeccanica" },
      { property: "og:description", content: "Planning des techniciens Cinemeccanica : missions, agendas et envoi hebdomadaire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

/** Redirige vers le planning si connecté, sinon vers la connexion. */
function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/planning" : "/auth", replace: true });
    });
  }, [navigate]);
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;
}
