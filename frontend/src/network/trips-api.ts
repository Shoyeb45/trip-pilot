import type { CreateTripPayload, CreateTripResponse, TripDetail } from "../types/trip";
import { apiClient } from "./api-client";

export async function createTrip(
  payload: CreateTripPayload,
): Promise<CreateTripResponse> {
  return apiClient.post<CreateTripResponse>("/trip/", payload);
}

export async function pollTrip(
  tripId: string,
): Promise<TripDetail> {
  return apiClient.get<TripDetail>(`/trip/poll/${tripId}/`);
}
