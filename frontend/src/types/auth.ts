export enum TokenStorageKey {
  ACCESS_TOKEN = "access_token",
  REFRESH_TOKEN = "refresh_token",
}

export interface Tokens {
  [TokenStorageKey.ACCESS_TOKEN]: string;
  [TokenStorageKey.REFRESH_TOKEN]: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface SignupPayload {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  logout: () => void;
}
