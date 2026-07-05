import type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
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
