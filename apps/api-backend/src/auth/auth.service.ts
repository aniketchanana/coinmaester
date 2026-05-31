import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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

    const user = await this.prisma.client.user.upsert({
      where: { googleId: payload.googleId },
      create: {
        googleId: payload.googleId,
        email: payload.email,
        name: payload.name,
        emailVerified: payload.emailVerified ?? null,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        accessTokenExpires,
        scope: payload.scope,
      },
      update: {
        name: payload.name,
        emailVerified: payload.emailVerified ?? null,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken ?? undefined,
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
