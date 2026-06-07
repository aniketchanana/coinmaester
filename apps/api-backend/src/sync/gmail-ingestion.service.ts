import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JOB_STATUS } from '@repo/constant';
import { Prisma, type SyncStatus } from '@repo/database';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { isAxiosError } from 'axios';

import { AuthService } from '../auth/auth.service';
import { createHttpClient } from '../common/http-client';
import { PrismaService } from '../database/prisma.service';
import { EmailFileStorageService } from '../storage/email-file-storage.service';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
const LIST_PAGE_SIZE = 100;
const INITIAL_SYNC_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const SUBSEQUENT_SYNC_BUFFER_MS = 5 * 60 * 1000;

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailApiBody {
  data?: string;
  size?: number;
}

interface GmailApiPayload {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: GmailApiBody;
  parts?: GmailApiPayload[];
}

interface GmailApiMessage {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailApiPayload;
}

interface GmailMessageListItem {
  id: string;
}

interface GmailMessageListResponse {
  messages?: GmailMessageListItem[];
  nextPageToken?: string;
}

interface IngestedMessage {
  conversationId: string;
  header: string;
  messageId: string;
  receivedAtMs: number;
  body: string;
}

/** Fetches inbox messages from the Gmail API for on-demand sync jobs. */
@Injectable()
export class GmailIngestionService {
  private readonly logger = new Logger(GmailIngestionService.name);
  private readonly gmailClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailFileStorage: EmailFileStorageService,
  ) {
    this.gmailClient = createHttpClient({ baseURL: GMAIL_API_BASE });
  }

  async processJob(emailSyncId: string): Promise<void> {
    const job = await this.prisma.client.emailSync.findUnique({
      where: { id: emailSyncId },
      select: { id: true, userId: true, createdAt: true, status: true },
    });


    if (!job || job.status !== JOB_STATUS.IN_PROGRESS) {
      return;
    }

    const { userId, createdAt: syncCreatedAt } = job;

    try {
      const accessToken = await this.authService.getValidGoogleAccessToken(
        userId,
      );
      const bounds = await this.resolveSyncBounds(userId, syncCreatedAt);
      const messageIds = await this.listInboxMessageIdsInBounds(
        accessToken,
        bounds.after,
        bounds.before,
      );
      const messages = await this.fetchAndMapMessages(accessToken, messageIds);
      const filtered = messages.filter(
        (message) =>
          message.receivedAtMs > bounds.after.getTime() &&
          message.receivedAtMs < bounds.before.getTime(),
      );

      await this.persistMessages(emailSyncId, filtered);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Gmail ingestion failed for job ${emailSyncId}: ${message}`,
      );

      await this.prisma.client.emailSync.update({
        where: { id: emailSyncId },
        data: { status: JOB_STATUS.FAILED as SyncStatus },
      });
    }
  }

  private async resolveSyncBounds(
    userId: string,
    syncCreatedAt: Date,
  ): Promise<{ after: Date; before: Date }> {
    const before = syncCreatedAt;

    const lastCompleted = await this.prisma.client.emailSync.findFirst({
      where: {
        userId,
        status: JOB_STATUS.COMPLETED as SyncStatus,
        createdAt: { lt: before },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (lastCompleted) {
      return {
        after: new Date(
          lastCompleted.createdAt.getTime() - SUBSEQUENT_SYNC_BUFFER_MS,
        ),
        before,
      };
    }

    return {
      after: new Date(before.getTime() - INITIAL_SYNC_LOOKBACK_MS),
      before,
    };
  }

  private async persistMessages(
    emailSyncId: string,
    messages: IngestedMessage[],
  ): Promise<void> {
    let inserted = 0;

    for (const message of messages) {
      const persisted = await this.persistMessage(message);
      if (persisted) {
        inserted += 1;
      }
    }

    await this.prisma.client.emailSync.update({
      where: { id: emailSyncId },
      data: { status: JOB_STATUS.COMPLETED as SyncStatus },
    });

    this.logger.log(
      `Gmail ingestion completed for job ${emailSyncId}: ${inserted} new, ${messages.length - inserted} skipped`,
    );
  }

  private async persistMessage(message: IngestedMessage): Promise<boolean> {
    const existing = await this.prisma.client.gmailMessage.findUnique({
      where: { messageId: message.messageId },
      select: { id: true },
    });
    if (existing) {
      return false;
    }

    try {
      const row = await this.prisma.client.gmailMessage.create({
        data: {
          conversationId: message.conversationId,
          header: message.header,
          messageId: message.messageId,
          emailBody: '',
          internalDate: new Date(message.receivedAtMs),
        },
      });

      if (message.body.length > 0) {
        const emailBodyPath = await this.emailFileStorage.writeBody(
          row.id,
          message.body,
        );
        await this.prisma.client.gmailMessage.update({
          where: { id: row.id },
          data: { emailBody: emailBodyPath },
        });
      }

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

  private async listInboxMessageIdsInBounds(
    accessToken: string,
    after: Date,
    before: Date,
  ): Promise<string[]> {
    const query = this.formatBoundedInboxQuery(after, before);
    const messageIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const data = await this.getGmailResource(accessToken, '/users/me/messages', {
        q: query,
        maxResults: LIST_PAGE_SIZE,
        pageToken,
      });
      const listResponse = this.parseGmailMessageListResponse(data);

      for (const message of listResponse.messages ?? []) {
        messageIds.push(message.id);
      }

      pageToken = listResponse.nextPageToken;
    } while (pageToken);

    return messageIds;
  }

  private formatBoundedInboxQuery(after: Date, before: Date): string {
    const afterEpoch = Math.floor(after.getTime() / 1000);
    const beforeEpoch = Math.floor(before.getTime() / 1000);
    return `in:inbox after:${afterEpoch} before:${beforeEpoch}`;
  }

  private async fetchAndMapMessages(
    accessToken: string,
    messageIds: string[],
  ): Promise<IngestedMessage[]> {
    const messages: IngestedMessage[] = [];

    for (const messageId of messageIds) {
      const raw = await this.fetchMessage(accessToken, messageId);
      messages.push(this.mapIngestedMessage(raw));
    }

    messages.sort((a, b) => a.receivedAtMs - b.receivedAtMs);

    return messages;
  }

  private mapIngestedMessage(raw: GmailApiMessage): IngestedMessage {
    const messageId = raw.id;
    const conversationId = raw.threadId ?? messageId;

    return {
      messageId,
      conversationId,
      header: this.formatHeader(raw),
      receivedAtMs: this.parseInternalDateMs(raw.internalDate),
      body: raw.payload ? this.extractEmailBody(raw.payload) : '',
    };
  }

  private async fetchMessage(
    accessToken: string,
    messageId: string,
  ): Promise<GmailApiMessage> {
    const data = await this.getGmailResource(
      accessToken,
      `/users/me/messages/${messageId}`,
      { format: 'full' },
    );

    return this.parseGmailApiMessage(data);
  }

  private extractEmailBody(payload: GmailApiPayload): string {
    const plain = this.findBodyByMimeType(payload, 'text/plain');
    if (plain) {
      return plain;
    }

    const html = this.findBodyByMimeType(payload, 'text/html');
    return html ?? '';
  }

  private findBodyByMimeType(
    payload: GmailApiPayload,
    mimeType: string,
  ): string | undefined {
    if (payload.mimeType?.toLowerCase() === mimeType.toLowerCase()) {
      const decoded = this.decodeGmailBody(payload.body?.data);
      if (decoded) {
        return decoded;
      }
    }

    for (const part of payload.parts ?? []) {
      const found = this.findBodyByMimeType(part, mimeType);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  private decodeGmailBody(data: string | undefined): string | undefined {
    if (!data) {
      return undefined;
    }

    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded =
      padding === 0 ? normalized : normalized + '='.repeat(4 - padding);

    try {
      return Buffer.from(padded, 'base64').toString('utf8');
    } catch {
      return undefined;
    }
  }

  private async getGmailResource(
    accessToken: string,
    path: string,
    params: Record<string, string | number | string[] | undefined>,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse<unknown> = await this.gmailClient.get(
        path,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params,
        },
      );

      if (response.data === undefined || response.data === null) {
        throw new Error('Gmail API returned an empty response');
      }

      return response.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        throw new UnauthorizedException(
          'Gmail access denied. Please sign in again with Google.',
        );
      }
      throw error;
    }
  }

  private parseGmailApiMessage(data: unknown): GmailApiMessage {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid Gmail message response');
    }

    const record = data as Record<string, unknown>;
    if (typeof record.id !== 'string') {
      throw new Error('Invalid Gmail message response');
    }

    const message: GmailApiMessage = { id: record.id };

    if (typeof record.threadId === 'string') {
      message.threadId = record.threadId;
    }

    if (
      typeof record.internalDate === 'string' ||
      typeof record.internalDate === 'number'
    ) {
      message.internalDate = String(record.internalDate);
    }

    if (this.isGmailApiPayload(record.payload)) {
      message.payload = record.payload;
    }

    return message;
  }

  private parseGmailMessageListResponse(data: unknown): GmailMessageListResponse {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid Gmail message list response');
    }

    const record = data as Record<string, unknown>;
    const response: GmailMessageListResponse = {};

    if (typeof record.nextPageToken === 'string') {
      response.nextPageToken = record.nextPageToken;
    }

    if (Array.isArray(record.messages)) {
      response.messages = record.messages.filter((message) =>
        this.isGmailMessageListItem(message),
      );
    }

    return response;
  }

  private isGmailMessageListItem(value: unknown): value is GmailMessageListItem {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const record = value as Record<string, unknown>;
    return typeof record.id === 'string';
  }

  private isGmailApiPayload(value: unknown): value is GmailApiPayload {
    return typeof value === 'object' && value !== null;
  }

  private parseInternalDateMs(value: string | number | undefined): number {
    if (value === undefined) {
      return 0;
    }

    const ms = Number(value);
    return Number.isFinite(ms) ? ms : 0;
  }

  private formatHeader(message: GmailApiMessage): string {
    const headers = message.payload?.headers ?? [];
    const get = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
        ?.value ?? '';

    const from = get('From');
    const subject = get('Subject');
    const date = get('Date');

    return `From: ${from} | Subject: ${subject} | Date: ${date}`;
  }
}
