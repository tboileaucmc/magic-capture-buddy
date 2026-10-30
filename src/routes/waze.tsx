import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wazeAppUrl, wazeWebUrl } from "@/lib/waze";
import logo from "@/assets/logo-cmc.png.asset.json";

export const Route = createFileRoute("/waze")({
  validateSearch: (search: Record<string, unknown>) => ({
    address: typeof search.address === "string" ? search.address.slice(0, 250) : "",
  }),
  head: () => ({ meta: [
    { title: "Itinéraire Waze — Cinemeccanica" },
    { name: "description", content: "Ouvrir l’itinéraire de votre mission Cinemeccanica dans Waze." },
    { property: "og:title", content: "Itinéraire Waze — Cinemeccanica" },
    { property: "og:description", content: "Rejoignez le lieu de votre mission avec Waze." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: WazeDestination,
});

function WazeDestination() {
  const { address } = Route.useSearch();
  const [android, setAndroid] = useState(false);
  useEffect(() => setAndroid(/Android/i.test(navigator.userAgent)), []);
  return (
    <main className="cmc-theme flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="w-full max-w-md space-y-6">
        <img src={logo.url} alt="Cinemeccanica France" className="h-auto w-56 max-w-full" />
        <h1 className="text-2xl font-semibold">Itinéraire de la mission</h1>
        {address ? <>
          <p className="flex items-start gap-3 break-words text-muted-foreground"><MapPin className="mt-1 size-5 shrink-0" />{address}</p>
          <Button size="lg" className="w-full" asChild>
            <a href={wazeAppUrl(address, android)}><Navigation /> Ouvrir l’application Waze</a>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href={wazeWebUrl(address)}>Ouvrir Waze dans le navigateur</a>
          </Button>
        </> : <p className="text-muted-foreground">Aucune adresse dans ce lien.</p>}
      </div>
    </main>
  );
}