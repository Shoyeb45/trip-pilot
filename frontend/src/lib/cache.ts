// hybrid module, either works
import { LRUCache } from "lru-cache";
import type { Location } from "../types/location-search";


const options = {
  max: 1000,
  ttl: 1000 * 60 * 5,
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
};

export const cache = new LRUCache<string, Location[]>(options);

