import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const searchCinemaAddresses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(3).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_MAPS_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (!key || !lovableKey) throw new Error("La connexion Google Maps n’est pas configurée.");
    const response = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": key,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.attributions",
      },
      body: JSON.stringify({
        textQuery: data.query,
        includedType: "movie_theater",
        strictTypeFiltering: true,
        pageSize: 5,
        languageCode: "fr",
        regionCode: "FR",
        locationBias: { rectangle: { low: { latitude: 41.3, longitude: -5.2 }, high: { latitude: 51.2, longitude: 9.7 } } },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Google Maps [${response.status}]: ${body}`);
      if (response.status === 403) {
        let reason: string | undefined;
        try {
          const error = JSON.parse(body) as { error?: { details?: { reason?: string }[] } };
          reason = error.error?.details?.find((detail) => detail.reason)?.reason;
        } catch { /* Non-JSON provider response. */ }
        if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("Google Maps bloque la recherche : les restrictions de la clé serveur doivent être corrigées.");
        if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error("Google Maps bloque la recherche : l’accès à Places doit être autorisé sur la clé serveur.");
      }
      throw new Error(`Recherche Google Maps indisponible (${response.status}). Vous pouvez saisir l’adresse manuellement.`);
    }
    const result = await response.json() as {
      places?: { id: string; displayName?: { text?: string }; formattedAddress?: string; attributions?: { provider?: string; providerUri?: string }[] }[];
    };
    return (result.places ?? []).filter((place) => place.formattedAddress).map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? "Cinéma",
      address: place.formattedAddress ?? "",
      attributions: place.attributions ?? [],
    }));
  });