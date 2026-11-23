import { test } from "node:test";
import assert from "node:assert/strict";
import { cinemaAddressesFromPhoton, createCinemaSearch } from "./cinema-address.server";

const cinema = { properties: { osm_id: 123, osm_type: "W", osm_key: "amenity", osm_value: "cinema", name: "Cinéma Lumière", housenumber: "12", street: "Rue du Cinéma", postcode: "75001", city: "Paris", country: "France" } };

test("cinema search returns usable addresses, not other establishments or duplicate results", () => {
  const places = cinemaAddressesFromPhoton({ features: [cinema, cinema, { properties: { ...cinema.properties, osm_value: "restaurant" } }, { properties: { osm_id: 456, osm_key: "amenity", osm_value: "cinema", name: "Sans adresse" } }] });
  assert.deepEqual(places, [{ id: "W:123", name: "Cinéma Lumière", address: "12 Rue du Cinéma, 75001 Paris, France" }]);
});

test("search uses OpenStreetMap cinema filtering and caches repeated searches without Google calls", async () => {
  let calls = 0;
  const search = createCinemaSearch(async (input) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://photon.komoot.io");
    assert.equal(url.searchParams.get("osm_tag"), "amenity:cinema");
    assert.equal(url.searchParams.get("q"), "Lumière Paris");
    return new Response(JSON.stringify({ features: [cinema] }));
  });
  assert.equal((await search("Lumière Paris"))[0]?.address, "12 Rue du Cinéma, 75001 Paris, France");
  await search(" lumière paris ");
  assert.equal(calls, 1);
});

test("provider errors are recoverable and do not cache failed results", async () => {
  let time = 1000;
  let calls = 0;
  const search = createCinemaSearch(async () => { calls++; return new Response("", { status: calls === 1 ? 429 : 200 }); }, () => time);
  await assert.rejects(search("Paris"), /saisir l’adresse manuellement/);
  time += 2000;
  await assert.rejects(search("Paris"), /saisir l’adresse manuellement/); // Invalid JSON is also handled.
  assert.equal(calls, 2);
});

test("different queries cannot bypass the local request cooldown", async () => {
  const search = createCinemaSearch(async () => new Response('{"features":[]}'), () => 1000);
  await search("Paris");
  await assert.rejects(search("Lyon"), /Recherche occupée/);
});