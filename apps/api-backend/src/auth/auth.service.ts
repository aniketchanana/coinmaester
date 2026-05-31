import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { decryptAes, encryptAes } from '../common/aes-encryption';
import { httpClient } from '../common/http-client';
import { PrismaService } from '../database/prisma.service';
import type {
  GoogleAuthPayload,
  JwtPayload,
  SessionUser,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  async loginWithGoogle(payload: GoogleAuthPayload): Promise<{
    accessToken: string;
    user: SessionUser;
  }> {
    const accessTokenExpires =
      payload.expiresIn != null
        ? new Date(Date.now() + payload.expiresIn * 1000)
        : null;

    const encryptedRefreshToken = payload.refreshToken
      ? encryptAes(payload.refreshToken)
      : null;

    const user = await this.prisma.client.user.upsert({
      where: { googleId: payload.googleId },
      create: {
        googleId: payload.googleId,
        email: payload.email,
        name: payload.name,
        emailVerified: payload.emailVerified ?? null,
        accessToken: payload.accessToken,
        refreshToken: encryptedRefreshToken,
        accessTokenExpires,
        scope: payload.scope,
      },
      update: {
        name: payload.name,
        emailVerified: payload.emailVerified ?? null,
        accessToken: payload.accessToken,
        refreshToken: encryptedRefreshToken ?? undefined,
        accessTokenExpires,
        scope: payload.scope,
      },
    });

    const accessToken = await this.signToken(user.id, user.email);

    return {
      accessToken,
      user: this.toSessionUser(user),
    };
  }

  async getDecryptedRefreshToken(userId: string): Promise<string | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { refreshToken: true },
    });

    if (!user?.refreshToken) {
      return null;
    }

    return decryptAes(user.refreshToken);
  }

  private static readonly TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

  isGoogleAccessTokenExpired(accessTokenExpires: Date | null): boolean {
    if (!accessTokenExpires) {
      return true;
    }

    return (
      accessTokenExpires.getTime() <=
      Date.now() + AuthService.TOKEN_EXPIRY_BUFFER_MS
    );
  }

  async refreshAccessToken(userId: string): Promise<string> {
    const refreshToken = await this.getDecryptedRefreshToken(userId);

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Google refresh token missing. Please sign in again with Google.',
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set',
      );
    }

    const { data } = await httpClient.post<{
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    }>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    const accessTokenExpires = new Date(Date.now() + data.expires_in * 1000);
    const encryptedRefreshToken = data.refresh_token
      ? encryptAes(data.refresh_token)
      : undefined;

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        accessToken: data.access_token,
        accessTokenExpires,
        ...(encryptedRefreshToken
          ? { refreshToken: encryptedRefreshToken }
          : {}),
      },
    });

    return data.access_token;
  }

  async getValidGoogleAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        accessTokenExpires: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (
      !this.isGoogleAccessTokenExpired(user.accessTokenExpires) &&
      user.accessToken
    ) {
      return user.accessToken;
    }

    return this.refreshAccessToken(userId);
  }

  async getUserById(userId: string): Promise<SessionUser> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toSessionUser(user);
  }

  signToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.signAsync(payload);
  }

  verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: Date | null;
  }): SessionUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    };
  }
}
