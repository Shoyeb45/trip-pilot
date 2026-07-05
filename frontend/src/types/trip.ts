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

export interface TripLocation {
  id: string;
  display_name: string;
  city?: string;
  state?: string;
  country: string;
  country_code: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TripRoute {
  id: string;
  start_location: TripLocation;
  end_location: TripLocation;
  distance: number;
  time: number;
  points_encoded: string;
  bbox: number[];
  max_speed?: number;
  average_speed?: number;
  created_at: string;
  updated_at: string;
}

export interface TripStatusEnum {
  value: "draft" | "calculating" | "completed" | "failed";
  label: string;
}

export interface GenerateStageEnum {
  value: "generating_route" | "generating_fuel_stops" | "generating_rest_stops" | "generating_logs" | "generation_completed";
  label: string;
}

export interface TripDetail {
  id: string;
  current_location: TripLocation;
  pickup_location: TripLocation;
  drop_location: TripLocation;
  truck_number: number;
  tailor_number: number;
  trip_status: TripStatusEnum;
  generate_stage: GenerateStageEnum | null;
  start_date: string;
  curr_to_pickup: TripRoute | null;
  pickup_to_drop: TripRoute | null;
  loading_text: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

