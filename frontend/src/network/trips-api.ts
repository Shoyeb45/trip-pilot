import type { CreateTripPayload, CreateTripResponse } from "../types/trip";
import { apiClient } from "./api-client";

export async function createTrip(
  payload: CreateTripPayload,
): Promise<CreateTripResponse> {
  return apiClient.post<CreateTripResponse>("/trip/", payload);
}
