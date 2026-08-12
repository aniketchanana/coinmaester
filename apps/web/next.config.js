import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// Monorepo root `.env` (Next only auto-loads apps/web/.env*).
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env'),
});

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/ui', '@repo/constant'],
  poweredByHeader: false,
  // Expose root AI_PARSING_ENABLED to client components (defaults to enabled).
  env: {
    NEXT_PUBLIC_AI_PARSING_ENABLED:
      process.env.NEXT_PUBLIC_AI_PARSING_ENABLED ??
      process.env.AI_PARSING_ENABLED ??
      'true',
  },
  async rewrites() {
    const apiInternal = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternal}/:path*`,
      },
      // MCP OAuth 2.1 lives on api-backend but must be same-origin with the
      // web app so the `access_token` session cookie is readable during the
      // `/authorize` consent step. These proxy the SDK's fixed root paths
      // (issuer = this web domain). The `/mcp` protocol endpoint itself is
      // reached via the `/api/*` rewrite above (`/api/mcp` -> api-backend
      // `/mcp`), because `/mcp` is taken by the dashboard page.
      {
        source: '/.well-known/:path*',
        destination: `${apiInternal}/.well-known/:path*`,
      },
      { source: '/authorize', destination: `${apiInternal}/authorize` },
      { source: '/token', destination: `${apiInternal}/token` },
      { source: '/register', destination: `${apiInternal}/register` },
      { source: '/revoke', destination: `${apiInternal}/revoke` },
      { source: '/auth/google', destination: `${apiInternal}/auth/google` },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
