import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { McpApiKeyService } from '../api-key-management/mcp-api-key.service';

export type McpAuthenticatedRequest = Request & { mcpUserId: string };

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(private readonly apiKeys: McpApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<McpAuthenticatedRequest>();
    const key = this.extractKey(req);
    if (!key) {
      throw new UnauthorizedException('Missing MCP API Key');
    }
    const userId = await this.apiKeys.verifyKey(key);
    if (!userId) {
      throw new UnauthorizedException('Invalid or revoked MCP API Key');
    }

    req.mcpUserId = userId;
    return true;
  }

  private extractKey(req: Request): string | null {
    const authorization = req.headers['authorization'] as string;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    return null;
  }
}
