import axios from "axios";
import type { LocationResponse, Location } from "../types/location-search";
import { cache } from "../lib/cache";

const LOCATION_API = `https://photon.komoot.io/api/?q=`;

export const getLocations = async (query: string): Promise<Location[]> => {
  const res = await axios.get<LocationResponse>(LOCATION_API + query);
  const locations = res.data;

  if (cache.has(query)) {
    return cache.get(query) ?? [];
  }

  const set = new Set<string>();

  const listOfLocations: Location[] = [];

  for (const location of locations.features) {
    const {
      name: city,
      state,
      postcode,
      country,
      countrycode: countryCode,
      osm_id: place_id
    } = location.properties;

    let displayName = "";
    if (city) displayName += city + ", ";

    if (state) {
      displayName += state + ", ";
    }

    if (country) {
      displayName += country;
    }

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
      place_id
    });
  }

  cache.set(query, listOfLocations);
  return listOfLocations;
};
