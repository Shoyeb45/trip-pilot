import axios from "axios";
import type { LocationResponse, Location } from "../types/location-search";
import { cache } from "../lib/cache";

const LOCATION_API = "https://photon.komoot.io/api/?q=";

export const getLocations = async (query: string): Promise<Location[]> => {
  if (cache.has(query)) {
    return cache.get(query) ?? [];
  }

  const res = await axios.get<LocationResponse>(
    LOCATION_API + encodeURIComponent(query),
  );
  const locations = res.data;

  const set = new Set<string>();
  const listOfLocations: Location[] = [];

  for (const location of locations.features) {
    if (location.properties.type !== "city") {
      continue;
    }

    const {
      name: city,
      state,
      postcode,
      country,
      countrycode: countryCode,
      osm_id: place_id,
    } = location.properties;

    const parts: string[] = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country) parts.push(country);
    const displayName = parts.join(", ");

    if (set.has(displayName)) {
      continue;
    }

    set.add(displayName);
    listOfLocations.push({
      displayName,
      city,
      state,
      country,
      countryCode,
      pincode: postcode,
      latitude: location.geometry.coordinates?.[1],
      longitude: location.geometry.coordinates?.[0],
      place_id,
    });
  }

  cache.set(query, listOfLocations);
  return listOfLocations;
};
