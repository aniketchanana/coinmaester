import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '../../../lib/auth';

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
  }

  const response = NextResponse.redirect(new URL('/transactions', request.url));

  response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });

  return response;
}
