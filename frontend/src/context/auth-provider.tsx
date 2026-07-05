import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AuthContext } from "../context/auth-context";
import { apiClient } from "../network/api-client";
import {
  getCurrentUser,
  login as loginApi,
  signup as signupApi,
  updateProfile as updateProfileApi,
} from "../network/auth-api";
import type {
  AuthContextValue,
  LoginPayload,
  SignupPayload,
  Tokens,
  UpdateProfilePayload,
  User,
} from "../types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = apiClient.getAccessToken();
      const refreshToken = apiClient.getRefreshToken();

      if (!accessToken || !refreshToken) {
        setIsLoading(false);
        return;
      }

      apiClient.startTokenRefreshTimer();

      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        apiClient.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const handleAuthSuccess = useCallback((authenticatedUser: User, tokens: Tokens) => {
    apiClient.setTokens(tokens);
    setUser(authenticatedUser);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { user: authenticatedUser, tokens } = await loginApi(payload);
    handleAuthSuccess(authenticatedUser, tokens);
  }, [handleAuthSuccess]);

  const signup = useCallback(async (payload: SignupPayload) => {
    const { user: authenticatedUser, tokens } = await signupApi(payload);
    handleAuthSuccess(authenticatedUser, tokens);
  }, [handleAuthSuccess]);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updatedUser = await updateProfileApi(payload);
    setUser(updatedUser);
  }, []);

  const logout = useCallback(() => {
    apiClient.clearTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      signup,
      updateProfile,
      logout,
    }),
    [user, isLoading, login, signup, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
