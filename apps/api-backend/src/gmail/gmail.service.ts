import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@repo/database';
import { google } from 'googleapis';

import { PRISMA } from '../app.module';
import { QueueService } from '../queue/queue.service';

type GmailHeader = { name?: string | null; value?: string | null };

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncAllUsers() {
    const users = await this.prisma.user.findMany({
      where: {
        accounts: {
          some: { provider: 'google', refresh_token: { not: null } },
        },
      },
      select: { id: true },
    });

    for (const user of users) {
      try {
        await this.syncUser(user.id);
      } catch (error) {
        this.logger.error(`Failed to sync user ${user.id}`, error);
      }
    }
  }

  async syncUser(userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { userId, provider: 'google' },
    });

    if (!account?.refresh_token) {
      this.logger.warn(`No Google refresh token for user ${userId}`);
      return { synced: 0 };
    }

    const oauth2Client = new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
    );

    oauth2Client.setCredentials({
      refresh_token: account.refresh_token,
      access_token: account.access_token ?? undefined,
      expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    });

    oauth2Client.on('tokens', async (tokens) => {
      await this.prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token ?? account.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
          refresh_token: tokens.refresh_token ?? account.refresh_token,
        },
      });
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'newer_than:7d',
      maxResults: 50,
    });

    const messages = listResponse.data.messages ?? [];
    let synced = 0;

    for (const message of messages) {
      if (!message.id) continue;

      const existing = await this.prisma.emailMessage.findUnique({
        where: {
          userId_gmailId: { userId, gmailId: message.id },
        },
      });

      if (existing) continue;

      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = (detail.data.payload?.headers ?? []) as GmailHeader[];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value ?? null;

      const receivedAtHeader = getHeader('Date');
      const receivedAt = receivedAtHeader
        ? new Date(receivedAtHeader)
        : new Date(Number(detail.data.internalDate ?? Date.now()));

      const created = await this.prisma.emailMessage.create({
        data: {
          userId,
          gmailId: message.id,
          threadId: detail.data.threadId ?? null,
          subject: getHeader('Subject'),
          fromAddress: getHeader('From'),
          snippet: detail.data.snippet ?? null,
          receivedAt,
          rawPayload: {
            labelIds: detail.data.labelIds,
            internalDate: detail.data.internalDate,
            headers: headers.map((h) => ({
              name: h.name,
              value: h.value,
            })),
          },
        },
      });

      await this.queueService.enqueueEmailProcessing(created.id, userId);

      synced += 1;
    }

    await this.prisma.gmailSyncState.upsert({
      where: { userId },
      create: {
        userId,
        lastSyncedAt: new Date(),
        lastHistoryId: listResponse.data.resultSizeEstimate?.toString(),
      },
      update: {
        lastSyncedAt: new Date(),
        lastHistoryId: listResponse.data.resultSizeEstimate?.toString(),
      },
    });

    this.logger.log(`Synced ${synced} new emails for user ${userId}`);
    return { synced };
  }
}
