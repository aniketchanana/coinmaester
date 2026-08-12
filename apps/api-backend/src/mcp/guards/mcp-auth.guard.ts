import { getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpApiKeyService } from '../api-key-management/mcp-api-key.service';
import { getResourceUrl } from '../oauth/oauth.config';
import { OAuthProvider } from '../oauth/oauth.provider';

export type McpAuthenticatedRequest = Request & { mcpUserId: string };

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeys: McpApiKeyService,
    private readonly oauthProvider: OAuthProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<McpAuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = this.extractKey(req);

    if (!key) {
      this.setChallenge(res);
      throw new UnauthorizedException('Missing bearer token');
    }

    // 1. Preferred: an OAuth 2.1 access token issued by our own flow (used by
    //    standards-based clients like Gemini).
    const oauthUserId = await this.verifyOAuthToken(key);
    if (oauthUserId) {
      req.mcpUserId = oauthUserId;
      return true;
    }

    // 2. Fallback: a static MCP API key (cmk_live_...) for manual/legacy use.
    const apiKeyUserId = await this.apiKeys.verifyKey(key);
    if (apiKeyUserId) {
      req.mcpUserId = apiKeyUserId;
      return true;
    }

    this.setChallenge(res);
    throw new UnauthorizedException('Invalid or expired credentials');
  }

  private async verifyOAuthToken(token: string): Promise<string | null> {
    try {
      const authInfo = await this.oauthProvider.verifyAccessToken(token);
      const userId = authInfo.extra?.userId;
      return typeof userId === 'string' ? userId : null;
    } catch {
      return null;
    }
  }

  /**
   * Advertise where to discover the OAuth flow. Per the MCP auth spec, a 401
   * from the resource server must point clients at the protected-resource
   * metadata so they can begin the authorization dance automatically.
   */
  private setChallenge(res: Response): void {
    const metadataUrl = getOAuthProtectedResourceMetadataUrl(getResourceUrl());
    res.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${metadataUrl}"`,
    );
  }

  private extractKey(req: Request): string | null {
    const authorization = req.headers['authorization'] as string;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    return null;
  }
}
