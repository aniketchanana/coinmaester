import type { CookieOptions, Response } from 'express';

import { ACCESS_TOKEN_COOKIE } from './auth.types';

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function jwtExpiryToMs(value: string | undefined): number {
  const match = value?.match(/^(\d+)([smhd])$/);
  if (!match) {
    return DEFAULT_MAX_AGE_MS;
  }

  return Number(match[1]) * (UNIT_MS[match[2] as string] ?? 0) || DEFAULT_MAX_AGE_MS;
}

function isSecureCookieContext(): boolean {
  const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
  return webUrl.startsWith('https://');
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookieContext(),
    sameSite: 'lax',
    path: '/',
    // In production, set COOKIE_DOMAIN to the shared parent domain
    // (e.g. ".example.com") so the web app's middleware can see the cookie.
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

export function setAccessTokenCookie(response: Response, token: string): void {
  response.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: jwtExpiryToMs(process.env.JWT_EXPIRES_IN),
  });
}

export function clearAccessTokenCookie(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
}
