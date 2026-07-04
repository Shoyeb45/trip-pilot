export type AuthContextProps = {
  accessToken: string | null;
  refreshToken: string | null;
  setAccessToken: (type: string) => void;
  setRefreshToken: (type: string) => void;
};

export interface Tokens {
  [TokenStorageKey.ACCESS_TOKEN]: string
  [TokenStorageKey.REFRESH_TOKEN]: string
}

export enum TokenStorageKey {
  ACCESS_TOKEN = "access_token",
  REFRESH_TOKEN = "refresh_token",
}