import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";
import { searchCinemaAddresses } from "@/lib/cinema-address.functions";
import { Button } from "@/components/ui/button";

export function CinemaAddressSuggestions({ title, active, onSelect }: {
  title: string;
  active: boolean;
  onSelect: (address: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [dismissed, setDismissed] = useState("");
  const search = useServerFn(searchCinemaAddresses);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(title.trim()), 900);
    return () => clearTimeout(timer);
  }, [title]);
  const enabled = active && query.length >= 3 && query === title.trim() && dismissed !== query;
  const { data, isFetching, error } = useQuery({
    queryKey: ["cinema-addresses", query],
    queryFn: () => search({ data: { query } }),
    enabled,
    staleTime: 60_000,
    gcTime: 60_000,
    retry: false,
  });
  if (!enabled) return null;
  return (
    <div className="space-y-1 rounded-md border bg-background p-2" aria-label="Adresses de cinémas proposées">
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>Cinémas proposés</span>
        {isFetching && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-label="Recherche en cours" />}
      </div>
      {error && <p role="status" className="px-1 text-xs text-destructive">{error.message}</p>}
      {!isFetching && !error && data?.length === 0 && <p role="status" className="px-1 text-xs text-muted-foreground">Aucun cinéma trouvé. Précisez son nom et sa ville.</p>}
      {data?.map((place) => (
        <div key={place.id}>
          <Button type="button" variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal py-2 text-left" onClick={() => {
            onSelect(place.address);
            setDismissed(query);
          }}>
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-words"><span className="block text-sm font-medium">{place.name}</span><span className="block text-xs text-muted-foreground">{place.address}</span></span>
          </Button>
          {place.attributions.map((attribution, index) => (
            <span key={index} className="px-1 text-xs text-muted-foreground">
              {attribution.providerUri?.startsWith("https://") ? <a href={attribution.providerUri} target="_blank" rel="noopener noreferrer">{attribution.provider}</a> : attribution.provider}
            </span>
          ))}
        </div>
      ))}
      <div className="px-1 pt-1 text-right text-xs text-muted-foreground">Google Maps</div>
    </div>
  );
}