import { createFileRoute } from "@tanstack/react-router";
import { PlanningView } from "@/components/PlanningView";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({
    meta: [
      { title: "Planning Techniciens — Cinemeccanica" },
      { name: "description", content: "Planning des techniciens par demi-journée avec envoi des missions sur leur agenda." },
      { property: "og:title", content: "Planning Techniciens — Cinemeccanica" },
      { property: "og:description", content: "Planning partagé des techniciens Cinemeccanica et gestion des invitations de mission." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <div className="force-landscape">
        <PlanningView />
      </div>
      <Toaster />
    </>
  ),
});
