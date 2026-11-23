type PhotonProperties = {
  osm_id?: number; osm_type?: string; osm_key?: string; osm_value?: string;
  name?: string; housenumber?: string; street?: string; postcode?: string;
  city?: string; town?: string; village?: string; country?: string;
};
type PhotonResponse = { features?: { properties?: PhotonProperties }[] };
export type CinemaAddress = { id: string; name: string; address: string };

export function cinemaAddressesFromPhoton(result: PhotonResponse): CinemaAddress[] {
  const seen = new Set<string>();
  return (result.features ?? []).flatMap(({ properties: p }) => {
    if (!p || p.osm_key !== "amenity" || p.osm_value !== "cinema" || !p.osm_id) return [];
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const locality = [p.postcode, p.city || p.town || p.village].filter(Boolean).join(" ");
    // A cinema name or country alone is not a usable address.
    if (!street && !locality) return [];
    const address = [street, locality, p.country].filter(Boolean).join(", ");
    const id = `${p.osm_type ?? "N"}:${p.osm_id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ id, name: p.name || "Cinéma", address }];
  }).slice(0, 5);
}

// Bounded, short-lived caches and a local cooldown protect the public demo API.
// These are per Worker instance, not a distributed rate-limit guarantee.
export function createCinemaSearch(request: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { expires: number; places: CinemaAddress[] }>();
  const pending = new Map<string, Promise<CinemaAddress[]>>();
  let nextRequestAt = 0;
  return async (query: string): Promise<CinemaAddress[]> => {
    const key = query.trim().toLocaleLowerCase("fr");
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return cached.places;
    const running = pending.get(key);
    if (running) return running;
    if (now() < nextRequestAt) throw new Error("Recherche occupée. Réessayez dans quelques secondes ou saisissez l’adresse manuellement.");
    nextRequestAt = now() + 1_000;
    const task = (async () => {
      const url = new URL("https://photon.komoot.io/api/");
      url.search = new URLSearchParams({ q: query.trim(), lang: "fr", limit: "5", osm_tag: "amenity:cinema", bbox: "-5.2,41.3,9.7,51.2" }).toString();
      try {
        const response = await request(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
          redirect: "manual",
        });
        if (!response.ok) throw new Error("Provider unavailable");
        const places = cinemaAddressesFromPhoton(await response.json() as PhotonResponse);
        for (const [entry, value] of cache) if (value.expires <= now()) cache.delete(entry);
        if (cache.size >= 100) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        cache.set(key, { expires: now() + 300_000, places });
        return places;
      } catch {
        throw new Error("Recherche OpenStreetMap indisponible. Vous pouvez saisir l’adresse manuellement.");
      }
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  };
}

export const searchPhotonCinemas = createCinemaSearch();