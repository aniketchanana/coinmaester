import {
  InvalidGrantError,
  InvalidTokenError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_RETURN_TO_COOKIE,
} from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { OAuthClientsStore } from './oauth-clients.store';
import { generateOpaqueToken, hashToken } from './oauth-tokens';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTHORIZATION_CODE_TTL_SECONDS,
  getIssuerUrl,
  REFRESH_TOKEN_TTL_SECONDS,
} from './oauth.config';

@Injectable()
export class OAuthProvider implements OAuthServerProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly clients: OAuthClientsStore,
    private readonly jwt: JwtService,
  ) {}

  get clientsStore(): OAuthClientsStore {
    return this.clients;
  }

  private async getLoggedInUserId(req: Request): Promise<string | null> {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;

    if (!token) {
      return null;
    }
    try {
      const payload = await this.authService.verifyToken(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const userId = await this.getLoggedInUserId(res.req);
    if (!userId) {
      const issuer = getIssuerUrl().origin;
      const returnTo = `${issuer}${res.req.originalUrl}`;
      res.cookie(OAUTH_RETURN_TO_COOKIE, returnTo, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
      res.redirect(`${issuer}/auth/google`);
      return;
    }

    const code = generateOpaqueToken();
    await this.prisma.client.oAuthAuthorizationCode.create({
      data: {
        code: hashToken(code),
        userId,
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: 'S256',
        scope: params.scopes?.join(' ') || null,
        resource: params.resource?.href ?? null,
        expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_SECONDS * 1000),
      },
    });

    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (params.state) {
      redirectUrl.searchParams.set('state', params.state);
    }
    res.redirect(redirectUrl.href);
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const record = await this.prisma.client.oAuthAuthorizationCode.findUnique({
      where: { code: hashToken(authorizationCode) },
    });

    if (!record || record.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid authorization code');
    }

    return record.codeChallenge;
  }

  private async issueTokens(params: {
    userId: string;
    clientId: string;
    scope: string | null;
    resource: string | null;
  }): Promise<OAuthTokens> {
    const accessToken = await this.jwt.signAsync(
      {
        sub: params.userId,
        client_id: params.clientId,
        scope: params.scope ?? undefined,
        aud: params.resource ?? undefined,
        token_use: 'mcp_access',
      },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    const refreshToken = generateOpaqueToken();
    await this.prisma.client.oAuthRefreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: params.userId,
        clientId: params.clientId,
        scope: params.scope,
        resource: params.resource,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      scope: params.scope ?? undefined,
      refresh_token: refreshToken,
    };
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    const record = await this.prisma.client.oAuthAuthorizationCode.findUnique({
      where: { code: hashToken(authorizationCode) },
    });

    if (!record || record.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid authorization code');
    }

    // Single-use: consume immediately so a stolen/replayed code is worthless.
    await this.prisma.client.oAuthAuthorizationCode.delete({
      where: { id: record.id },
    });

    if (record.expiresAt.getTime() < Date.now()) {
      throw new InvalidGrantError('Authorization code has expired');
    }

    if (redirectUri !== undefined && redirectUri !== record.redirectUri) {
      throw new InvalidGrantError('redirect_uri does not match');
    }

    return this.issueTokens({
      userId: record.userId,
      clientId: record.clientId,
      scope: record.scope,
      resource: record.resource,
    });
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    const record = await this.prisma.client.oAuthRefreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });

    if (
      !record ||
      record.clientId !== client.client_id ||
      record.revokedAt !== null ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new InvalidGrantError('Invalid refresh token');
    }

    // Rotation: burn the old refresh token so it can never be used twice.
    await this.prisma.client.oAuthRefreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      userId: record.userId,
      clientId: record.clientId,
      scope: record.scope,
      resource: record.resource,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        client_id: string;
        scope?: string;
        aud?: string;
        token_use?: string;
        exp?: number;
      }>(token);

      if (payload.token_use !== 'mcp_access') {
        throw new InvalidTokenError('Not an MCP access token');
      }

      return {
        token,
        clientId: payload.client_id,
        scopes: payload.scope ? payload.scope.split(' ') : [],
        expiresAt: payload.exp,
        resource: payload.aud ? new URL(payload.aud) : undefined,
        extra: { userId: payload.sub },
      };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      throw new InvalidTokenError('Invalid or expired access token');
    }
  }
  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    await this.prisma.client.oAuthRefreshToken.updateMany({
      where: {
        tokenHash: hashToken(request.token),
        clientId: client.client_id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}
