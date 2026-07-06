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
  place_name?: string;
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

export interface TripStop {
  id: string;
  stop_type: "pickup" | "dropoff" | "fuel" | "rest_break" | "sleeper_reset" | "restart_34hr";
  stop_type_display: string;
  location: TripLocation;
  arrival_time: string;
  departure_time: string;
  duration_hours: number;
  odometer_start: number;
  odometer_end: number;
  sequence: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface DutyLogEntry {
  id: string;
  duty_status: "off_duty" | "sleeper_berth" | "driving" | "on_duty";
  duty_status_display: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  miles_driven: number;
  odometer_start: number;
  odometer_end: number;
  trip_day: number;
  remarks: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface ELDDailyLog {
  id: string;
  day_number: number;
  log_date: string;
  off_duty_hours: number;
  sleeper_berth_hours: number;
  driving_hours: number;
  on_duty_hours: number;
  total_miles_driven: number;
  total_on_duty_hours: number;
  has_violations: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripViolation {
  id: string;
  violation_type: string;
  violation_type_display: string;
  occurred_at: string;
  description: string;
  trip_day: number | null;
  created_at: string;
  updated_at: string;
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
  stops: TripStop[];
  duty_log_entries: DutyLogEntry[];
  eld_daily_logs: ELDDailyLog[];
  violations: TripViolation[];
  loading_text: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface NormalizedLocationRoute {
  id: string;
  start_location: string; // UUID
  end_location: string; // UUID
  distance: number;
  time: number;
  points_encoded: string;
  bbox: number[];
  max_speed?: number;
  average_speed?: number;
  created_at: string;
  updated_at: string;
}

export interface NormalizedTripStop {
  id: string;
  stop_type: string;
  stop_type_display: string;
  location: string; // UUID
  arrival_time: string;
  departure_time: string;
  duration_hours: number;
  odometer_start: number;
  odometer_end: number;
  sequence: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface NormalizedTripDetail {
  id: string;
  locations: Record<string, TripLocation>;
  current_location: string; // UUID
  pickup_location: string; // UUID
  drop_location: string; // UUID
  truck_number: number;
  tailor_number: number;
  trip_status: TripStatusEnum;
  generate_stage: GenerateStageEnum | null;
  start_date: string;
  curr_to_pickup: NormalizedLocationRoute | null;
  pickup_to_drop: NormalizedLocationRoute | null;
  stops: NormalizedTripStop[];
  duty_log_entries: DutyLogEntry[];
  eld_daily_logs: ELDDailyLog[];
  violations: TripViolation[];
  loading_text: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

