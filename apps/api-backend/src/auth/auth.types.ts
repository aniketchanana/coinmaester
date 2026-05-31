export const ACCESS_TOKEN_COOKIE = 'access_token';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
};

export type GoogleAuthPayload = {
  googleId: string;
  email: string;
  name?: string;
  emailVerified?: Date | null;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
};
