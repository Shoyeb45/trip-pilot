import type {
  CreateTripPayload,
  CreateTripResponse,
  TripDetail,
  NormalizedTripDetail,
  TripRoute,
  GetTripsParams,
  PaginatedResponse,
} from "../types/trip";
import { apiClient } from "./api-client";

function denormalizeTripDetail(normalized: NormalizedTripDetail): TripDetail {
  const {
    locations,
    current_location,
    pickup_location,
    drop_location,
    curr_to_pickup,
    pickup_to_drop,
    stops: normalizedStops,
    ...rest
  } = normalized;

  const currentLoc = locations[current_location];
  const pickupLoc = locations[pickup_location];
  const dropLoc = locations[drop_location];

  const currToPickupRoute: TripRoute | null = curr_to_pickup
    ? {
        ...curr_to_pickup,
        start_location: locations[curr_to_pickup.start_location],
        end_location: locations[curr_to_pickup.end_location],
      }
    : null;

  const pickupToDropRoute: TripRoute | null = pickup_to_drop
    ? {
        ...pickup_to_drop,
        start_location: locations[pickup_to_drop.start_location],
        end_location: locations[pickup_to_drop.end_location],
      }
    : null;

  const stops = (normalizedStops || []).map((stop) => ({
    ...stop,
    stop_type: stop.stop_type as any,
    location: locations[stop.location],
  }));

  return {
    ...rest,
    current_location: currentLoc,
    pickup_location: pickupLoc,
    drop_location: dropLoc,
    curr_to_pickup: currToPickupRoute,
    pickup_to_drop: pickupToDropRoute,
    stops,
  };
}

export async function createTrip(
  payload: CreateTripPayload,
): Promise<CreateTripResponse> {
  return apiClient.post<CreateTripResponse>("/trip/", payload);
}

export async function pollTrip(tripId: string): Promise<TripDetail> {
  const data = await apiClient.get<NormalizedTripDetail>(`/trip/poll/${tripId}/`);
  return denormalizeTripDetail(data);
}

export async function getTrips(
  params?: GetTripsParams,
): Promise<PaginatedResponse<TripDetail>> {
  const response = await apiClient.get<PaginatedResponse<NormalizedTripDetail>>("/trip/", {
    params,
  });
  return {
    ...response,
    results: (response.results || []).map(denormalizeTripDetail),
  };
}
