import type { Location } from "./location-search";

export interface TripLocationPayload {
  city?: string;
  state?: string;
  country: string;
  country_code: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  place_id?: string;
}

export interface CreateTripPayload {
  truck_number: number;
  tailor_number: number;
  current_location: TripLocationPayload;
  pickup_location: TripLocationPayload;
  drop_location: TripLocationPayload;
  start_date?: string;
}

export interface CreateTripResponse {
  id: string;
}

export function toTripLocationPayload(location: Location): TripLocationPayload {
  return {
    city: location.city ?? "",
    state: location.state ?? "",
    country: location.country,
    country_code: location.countryCode,
    pincode: location.pincode ?? "",
    latitude: location.latitude,
    longitude: location.longitude,
    place_id: location.place_id != null ? String(location.place_id) : undefined,
  };
}
