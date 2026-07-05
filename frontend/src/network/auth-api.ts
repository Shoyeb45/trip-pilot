import type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  UpdateProfilePayload,
  User,
} from "../types/auth";
import { apiClient } from "./api-client";

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/auth/signup", payload);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/auth/login", payload);
}

export async function getCurrentUser(): Promise<User> {
  const data = await apiClient.get<{ user: User }>("/auth/me");
  return data.user;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const data = await apiClient.patch<{ user: User }>("/auth/me", payload);
  return data.user;
}
