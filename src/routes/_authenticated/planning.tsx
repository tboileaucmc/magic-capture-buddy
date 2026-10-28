import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlanningView } from "@/components/PlanningView";
import { Toaster } from "@/components/ui/sonner";
import logoAsset from "@/assets/logo-cmc.png.asset.json";

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
  component: PlanningPage,
});

function PlanningPage() {
  const [light, setLight] = useState(false);
  return (
    <>
      <div className={`force-landscape ${light ? "cmc-theme-light" : "cmc-theme"}`}>
        <PlanningView light={light} onToggleTheme={() => setLight((v) => !v)} />
        <img
          src={logoAsset.url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-1/2 z-50 w-[60%] max-w-[900px] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.045]"
        />
      </div>
      <Toaster />
    </>
  );
}
