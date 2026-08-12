const DEFAULT_ISSUER_URL = 'http://localhost:3001';

export const getIssuerUrl = (): URL => {
  return new URL(process.env.OAUTH_ISSUER_URL ?? DEFAULT_ISSUER_URL);
};

export const getResourceUrl = (): URL => {
  return new URL('/mcp', getIssuerUrl());
};

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30000; // 30000 days
export const AUTHORIZATION_CODE_TTL_SECONDS = 60; // 1 minute
