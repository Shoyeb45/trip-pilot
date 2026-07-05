// hybrid module, either works
import { LRUCache } from "lru-cache";
import type { Location } from "../types/location-search";


const options = {
  max: 1000,
  maxSize: 5000,
  // how long to live in ms
  ttl: 1000 * 60 * 5,
  // return stale items before removing from cache?
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
};

export const cache = new LRUCache<string, Location[]>(options);

