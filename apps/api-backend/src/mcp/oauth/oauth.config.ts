const DEFAULT_ISSUER_URL = 'http://localhost:3001';

export const getIssuerUrl = (): URL => {
  return new URL(process.env.OAUTH_ISSUER_URL ?? DEFAULT_ISSUER_URL);
};

export const getResourceUrl = (): URL => {
  // The MCP protocol endpoint is exposed at `/api/mcp` on the web origin
  // (proxied to api-backend's `/mcp`). `/mcp` itself is the dashboard page,
  // so the resource must live under the `/api` proxy prefix.
  return new URL('/api/mcp', getIssuerUrl());
};

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const AUTHORIZATION_CODE_TTL_SECONDS = 60; // 1 minute
