import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { isAxiosError } from 'axios';

import { AuthService } from '../auth/auth.service';
import { createHttpClient } from '../common/http-client';
import { PrismaService } from '../database/prisma.service';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
const GMAIL_INBOX_LABEL = 'INBOX';
const LIST_PAGE_SIZE = 100;

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

interface GmailApiPayload {
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

interface GmailApiMessage {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailApiPayload;
}

interface GmailMessageListItem {
  id: string;
  threadId?: string;
}

interface GmailMessageListResponse {
  messages?: GmailMessageListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailProfileResponse {
  historyId?: string;
  emailAddress?: string;
}

interface GmailHistoryMessage {
  id?: string;
  threadId?: string;
}

interface GmailHistoryLabelChange {
  message?: GmailHistoryMessage;
  labelIds?: string[];
}

interface GmailHistoryRecord {
  messagesAdded?: { message?: GmailHistoryMessage }[];
  labelsAdded?: GmailHistoryLabelChange[];
}

interface GmailHistoryListResponse {
  history?: GmailHistoryRecord[];
  historyId?: string;
  nextPageToken?: string;
}

export interface GmailMessage {
  conversationId: string;
  emailBody: string;
  header: string;
  messageId: string;
  receivedAtMs: number;
}

export interface GmailSyncResult {
  count: number;
  messages: GmailMessage[];
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private readonly gmailClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {
    this.gmailClient = createHttpClient({ baseURL: GMAIL_API_BASE });
  }

  async syncUserEmails(userId: string): Promise<GmailSyncResult> {
    const accessToken =
      await this.authService.getValidGoogleAccessToken(userId);
    const emailSync = await this.findEmailSyncState(userId);

    let messageIds: string[];
    let nextHistoryId: string;

    if (emailSync?.historyId) {
      ({ messageIds, nextHistoryId } = await this.listInboxMessageIdsFromHistory(
        accessToken,
        emailSync.historyId,
      ));
    } else if (emailSync?.lastSyncTime) {
      // Existing timestamp-only row: adopt a history cursor without re-listing mail.
      messageIds = [];
      nextHistoryId = await this.fetchMailboxHistoryId(accessToken);
    } else {
      const backfillAfter = await this.resolveInitialBackfillDate(userId);
      messageIds = await this.listInboxMessageIdsSince(
        accessToken,
        backfillAfter,
      );
      nextHistoryId = await this.fetchMailboxHistoryId(accessToken);
    }

    const { messages, latestReceivedMs } = await this.fetchAndMapMessages(
      accessToken,
      messageIds,
    );

    await this.prisma.client.emailSync.upsert({
      where: { userId },
      create: {
        userId,
        historyId: nextHistoryId,
        lastSyncTime: this.resolveLastSyncTime(
          latestReceivedMs,
          emailSync?.lastSyncTime,
        ),
      },
      update: {
        historyId: nextHistoryId,
        lastSyncTime: this.resolveLastSyncTime(
          latestReceivedMs,
          emailSync?.lastSyncTime,
        ),
      },
    });

    return {
      count: messages.length,
      messages,
    };
  }

  private async findEmailSyncState(
    userId: string,
  ): Promise<{ historyId: string | null; lastSyncTime: Date } | null> {
    const row: unknown = await this.prisma.client.emailSync.findUnique({
      where: { userId },
      select: { historyId: true, lastSyncTime: true },
    });

    return this.parseEmailSyncState(row);
  }

  private parseEmailSyncState(
    row: unknown,
  ): { historyId: string | null; lastSyncTime: Date } | null {
    if (typeof row !== 'object' || row === null) {
      return null;
    }

    const record = row as Record<string, unknown>;
    if (!(record.lastSyncTime instanceof Date)) {
      return null;
    }

    return {
      historyId:
        typeof record.historyId === 'string' ? record.historyId : null,
      lastSyncTime: record.lastSyncTime,
    };
  }

  private async resolveInitialBackfillDate(userId: string): Promise<Date> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user.createdAt;
  }

  private resolveLastSyncTime(
    latestReceivedMs: number,
    existingLastSyncTime?: Date,
  ): Date {
    if (latestReceivedMs > 0) {
      return new Date(latestReceivedMs);
    }

    return existingLastSyncTime ?? new Date();
  }

  private async listInboxMessageIdsFromHistory(
    accessToken: string,
    startHistoryId: string,
  ): Promise<{ messageIds: string[]; nextHistoryId: string }> {
    try {
      return await this.fetchHistoryPage(accessToken, startHistoryId);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        this.logger.warn(
          'Gmail historyId expired; falling back to profile history cursor',
        );
        const nextHistoryId = await this.fetchMailboxHistoryId(accessToken);
        return { messageIds: [], nextHistoryId };
      }
      throw error;
    }
  }

  private async fetchHistoryPage(
    accessToken: string,
    startHistoryId: string,
  ): Promise<{ messageIds: string[]; nextHistoryId: string }> {
    const messageIds = new Set<string>();
    let pageToken: string | undefined;
    let nextHistoryId = startHistoryId;

    do {
      const data = await this.getGmailResource(accessToken, '/users/me/history', {
        startHistoryId,
        pageToken,
        labelId: GMAIL_INBOX_LABEL,
        historyTypes: ['messageAdded', 'labelAdded'],
        maxResults: LIST_PAGE_SIZE,
      });
      const historyResponse = this.parseHistoryListResponse(data);

      if (historyResponse.historyId) {
        nextHistoryId = historyResponse.historyId;
      }

      for (const record of historyResponse.history ?? []) {
        for (const added of record.messagesAdded ?? []) {
          const id = added.message?.id;
          if (id) {
            messageIds.add(id);
          }
        }

        for (const labelChange of record.labelsAdded ?? []) {
          const id = labelChange.message?.id;
          if (id && labelChange.labelIds?.includes(GMAIL_INBOX_LABEL)) {
            messageIds.add(id);
          }
        }
      }

      pageToken = historyResponse.nextPageToken;
    } while (pageToken);

    return { messageIds: [...messageIds], nextHistoryId };
  }

  private async listInboxMessageIdsSince(
    accessToken: string,
    since: Date,
  ): Promise<string[]> {
    const query = this.formatInitialInboxQuery(since);
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

  private formatInitialInboxQuery(since: Date): string {
    const epochSeconds = Math.floor(since.getTime() / 1000);
    return `in:inbox after:${epochSeconds}`;
  }

  private async fetchMailboxHistoryId(accessToken: string): Promise<string> {
    const data = await this.getGmailResource(accessToken, '/users/me/profile', {});
    const profile = this.parseProfileResponse(data);

    if (!profile.historyId) {
      throw new Error('Gmail profile did not return a historyId');
    }

    return profile.historyId;
  }

  private async fetchAndMapMessages(
    accessToken: string,
    messageIds: string[],
  ): Promise<{ messages: GmailMessage[]; latestReceivedMs: number }> {
    const messages: GmailMessage[] = [];
    let latestReceivedMs = 0;

    for (const messageId of messageIds) {
      try {
        const raw = await this.fetchMessage(accessToken, messageId);
        const internalDate = this.parseInternalDateMs(raw.internalDate);

        if (internalDate > latestReceivedMs) {
          latestReceivedMs = internalDate;
        }

        messages.push(this.mapIngestedMessage(raw));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to fetch Gmail message ${messageId}: ${message}`,
        );
      }
    }

    messages.sort((a, b) => a.receivedAtMs - b.receivedAtMs);

    return { messages, latestReceivedMs };
  }

  private mapIngestedMessage(raw: GmailApiMessage): GmailMessage {
    const messageId = raw.id;
    const conversationId = raw.threadId ?? messageId;

    return {
      messageId,
      conversationId,
      header: this.formatHeader(raw),
      emailBody: this.extractEmailBody(raw),
      receivedAtMs: this.parseInternalDateMs(raw.internalDate),
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

  private parseProfileResponse(data: unknown): GmailProfileResponse {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid Gmail profile response');
    }

    const record = data as Record<string, unknown>;
    const profile: GmailProfileResponse = {};

    if (typeof record.historyId === 'string') {
      profile.historyId = record.historyId;
    }

    if (typeof record.emailAddress === 'string') {
      profile.emailAddress = record.emailAddress;
    }

    return profile;
  }

  private parseHistoryListResponse(data: unknown): GmailHistoryListResponse {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid Gmail history list response');
    }

    const record = data as Record<string, unknown>;
    const response: GmailHistoryListResponse = {};

    if (typeof record.historyId === 'string') {
      response.historyId = record.historyId;
    }

    if (typeof record.nextPageToken === 'string') {
      response.nextPageToken = record.nextPageToken;
    }

    if (Array.isArray(record.history)) {
      response.history = record.history.filter(
        (entry): entry is GmailHistoryRecord =>
          typeof entry === 'object' && entry !== null,
      );
    }

    return response;
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

    if (typeof record.resultSizeEstimate === 'number') {
      response.resultSizeEstimate = record.resultSizeEstimate;
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

  private parseInternalDateMs(value: string | number | undefined): number {
    if (value === undefined) {
      return 0;
    }

    const ms = Number(value);
    return Number.isFinite(ms) ? ms : 0;
  }

  private isGmailApiPayload(value: unknown): value is GmailApiPayload {
    return typeof value === 'object' && value !== null;
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

  private extractEmailBody(message: GmailApiMessage): string {
    const payload = message.payload;
    if (!payload) {
      return '';
    }

    const plain = this.findPartBody(payload.parts, 'text/plain');
    if (plain) {
      return plain;
    }

    const html = this.findPartBody(payload.parts, 'text/html');
    if (html) {
      return html;
    }

    return this.decodeBodyData(payload.body?.data) ?? '';
  }

  private findPartBody(
    parts: GmailMessagePart[] | undefined,
    mimeType: string,
  ): string | null {
    if (!parts?.length) {
      return null;
    }

    for (const part of parts) {
      if (part.mimeType === mimeType && part.body?.data) {
        const decoded = this.decodeBodyData(part.body.data);
        if (decoded) {
          return decoded;
        }
      }

      if (part.parts?.length) {
        const nested = this.findPartBody(part.parts, mimeType);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  private decodeBodyData(data?: string): string | null {
    if (!data) {
      return null;
    }

    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64').toString('utf-8');
  }
}
