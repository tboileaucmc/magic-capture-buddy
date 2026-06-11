import { createFileRoute } from "@tanstack/react-router";
import { PlanningView } from "@/components/PlanningView";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planning Techniciens" },
      { name: "description", content: "Planning hebdomadaire des techniciens par demi-journée avec envoi des missions sur leur agenda." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <PlanningView />
      <Toaster />
    </>
  );
}
