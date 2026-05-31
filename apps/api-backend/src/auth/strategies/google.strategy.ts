import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, StrategyOptions } from 'passport-google-oauth20';

import type { GoogleAuthPayload } from '../auth.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google', true) {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL must be set',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['openid', 'email', 'profile',
        'https://www.googleapis.com/auth/gmail.readonly'],
    } as StrategyOptions);
  }

  validate(
    accessToken: string,
    refreshToken: string,
    params: { expires_in?: number; scope?: string; },
    profile: Profile,
  ): GoogleAuthPayload {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new Error('Google account did not return an email address');
    }

    return {
      googleId: profile.id,
      email,
      name: profile.displayName || undefined,
      emailVerified: profile.emails?.[0]?.verified
        ? new Date()
        : null,
      accessToken,
      refreshToken: refreshToken || undefined,
      scope: 'openid email profile',
      expiresIn: params.expires_in
    };
  }
}
