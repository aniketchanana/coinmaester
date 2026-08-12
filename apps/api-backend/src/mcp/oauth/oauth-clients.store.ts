import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashToken } from './oauth-tokens';

@Injectable()
export class OAuthClientsStore implements OAuthRegisteredClientsStore {
  constructor(private readonly prisma: PrismaService) {}

  private toClientInfo(record: {
    clientId: string;
    clientName: string | null;
    redirectUris: unknown;
    grantTypes: string[];
    scope: string | null;
    tokenEndpointAuthMethod: string;
  }): OAuthClientInformationFull {
    return {
      client_id: record.clientId,
      client_name: record.clientName ?? undefined,
      redirect_uris: record.redirectUris as string[],
      grant_types: record.grantTypes,
      scope: record.scope ?? undefined,
      token_endpoint_auth_method: record.tokenEndpointAuthMethod,
    };
  }

  async getClient(
    clientId: string,
  ): Promise<OAuthClientInformationFull | undefined> {
    const record = await this.prisma.client.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!record) {
      return undefined;
    }

    return this.toClientInfo(record);
  }

  async registerClient(
    client: OAuthClientInformationFull,
  ): Promise<OAuthClientInformationFull> {
    await this.prisma.client.oAuthClient.create({
      data: {
        clientId: client.client_id,
        clientSecretHash: client.client_secret
          ? hashToken(client.client_secret)
          : null,
        clientName: client.client_name ?? null,
        redirectUris: client.redirect_uris,
        grantTypes: client.grant_types ?? [],
        scope: client.scope ?? null,
        tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? 'none',
      },
    });

    return client;
  }
}
