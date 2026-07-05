import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  AxiosError,
} from "axios";
import { TokenStorageKey, type Tokens } from "../types/auth";

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error_message: string;
  details?: Record<string, unknown>;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function getAccessTokenExpiryMs(accessToken: string): number | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);

    const decoded = JSON.parse(json) as { exp?: number };

    if (typeof decoded.exp !== "number") return null;
    return decoded.exp * 1000;
  } catch {
    return null;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.error_message) return data.error_message;
  }
  return "Something went wrong. Please try again.";
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedRequestsQueue: Array<(token: string) => void> = [];
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly REFRESH_BEFORE_MS = 60 * 1000;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }
  private static instance: ApiClient | null = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ApiClient();
    }
    return this.instance;
  }

  public getAccessToken(): string | null {
    return localStorage.getItem(TokenStorageKey.ACCESS_TOKEN);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem(TokenStorageKey.REFRESH_TOKEN);
  }

  public setTokens(tokens: Tokens): void {
    localStorage.setItem(
      TokenStorageKey.REFRESH_TOKEN,
      tokens[TokenStorageKey.REFRESH_TOKEN],
    );
    localStorage.setItem(
      TokenStorageKey.ACCESS_TOKEN,
      tokens[TokenStorageKey.ACCESS_TOKEN],
    );
    this.startTokenRefreshTimer();
  }

  public clearTokens(): void {
    this.stopTokenRefreshTimer();
    localStorage.removeItem(TokenStorageKey.REFRESH_TOKEN);
    localStorage.removeItem(TokenStorageKey.ACCESS_TOKEN);
  }

  /** Start proactive refresh timer; call after login or when tokens are restored. */
  public startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer();

    const accessToken = this.getAccessToken();
    if (!accessToken) return;

    const expMs = getAccessTokenExpiryMs(accessToken);
    if (expMs == null) return;

    const now = Date.now();
    const refreshAt = expMs - this.REFRESH_BEFORE_MS;
    if (refreshAt <= now) {
      void this.refreshAccessToken().catch(() => {});
      return;
    }

    this.refreshTimerId = setTimeout(() => {
      this.refreshTimerId = null;
      void this.refreshAccessToken().catch(() => {});
    }, refreshAt - now);
  }

  /** Stop proactive refresh timer; call on logout. */
  public stopTokenRefreshTimer(): void {
    if (this.refreshTimerId != null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const res = await axios.post<ApiResponse<Tokens>>(
        `${API_BASE_URL}/auth/refresh`,
        { refresh: refreshToken },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const tokens = res.data.data;
      this.setTokens(tokens);
      return tokens[TokenStorageKey.ACCESS_TOKEN];
    } catch (error) {
      this.clearTokens();
      window.location.href = "/";
      throw error;
    }
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.failedRequestsQueue.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAccessToken();
            this.isRefreshing = false;

            this.failedRequestsQueue.forEach((callback) => callback(newToken));
            this.failedRequestsQueue = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.failedRequestsQueue = [];
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  public async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.axiosInstance
      .get<ApiResponse<T>>(url, config)
      .then((res) => res.data.data);
  }

  public async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.axiosInstance
      .post<ApiResponse<T>>(url, data, config)
      .then((res) => res.data.data);
  }

  public async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.axiosInstance
      .put<ApiResponse<T>>(url, data, config)
      .then((res) => res.data.data);
  }

  public async patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.axiosInstance
      .patch<ApiResponse<T>>(url, data, config)
      .then((res) => res.data.data);
  }

  public async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.axiosInstance
      .delete<ApiResponse<T>>(url, config)
      .then((res) => res.data.data);
  }
}

export const apiClient = ApiClient.getInstance();
