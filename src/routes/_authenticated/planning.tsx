import { createFileRoute } from "@tanstack/react-router";
import { PlanningView } from "@/components/PlanningView";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({
    meta: [
      { title: "Planning Techniciens — Cinemeccanica" },
      { name: "description", content: "Planning des techniciens par demi-journée avec envoi des missions sur leur agenda." },
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
