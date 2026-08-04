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
