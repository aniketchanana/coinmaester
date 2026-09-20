import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JOB_STATUS } from '@repo/constant';
import type { SyncStatus } from '@repo/database';

import { isAiParsingEnabled } from '../common/ai-parsing';
import { PrismaService } from '../database/prisma.service';
import { RabbitMqPublisherService } from '../messaging/rabbitmq-publisher.service';
import { EmailFileStorageService } from '../storage/email-file-storage.service';
import type {
  GetEmailBodyResponse,
  GmailMessageDto,
  ListGmailMessagesResponse,
  RetryGmailMessagesResponse,
} from './gmail-messages.types';

interface ListGmailMessagesQuery {
  page: number;
  limit: number;
  status?: string;
}

const VALID_STATUSES = new Set<string>(Object.values(JOB_STATUS));

const HTML_MARKUP_PATTERN = /<[a-z!/][^>]*>/i;

@Injectable()
export class GmailMessagesService {
  private readonly logger = new Logger(GmailMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMqPublisher: RabbitMqPublisherService,
    private readonly emailFileStorage: EmailFileStorageService,
  ) {}

  async getEmailBody(
    userId: string,
    gmailMessageId: string,
  ): Promise<GetEmailBodyResponse> {
    const message = await this.prisma.client.gmailMessage.findFirst({
      where: { id: gmailMessageId, userId },
      select: {
        id: true,
        header: true,
        internalDate: true,
        emailBody: true,
      },
    });

    if (!message?.emailBody) {
      throw new NotFoundException(
        `No stored email found for Gmail message ${gmailMessageId}`,
      );
    }

    let body: string;
    try {
      body = await this.emailFileStorage.readBody(message.emailBody);
    } catch (error) {
      this.logger.warn(
        `Unable to read email body "${message.emailBody}" for Gmail message ${gmailMessageId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new NotFoundException(
        `No stored email found for Gmail message ${gmailMessageId}`,
      );
    }

    const { from, subject } = this.parseHeader(message.header);

    return {
      gmailMessageId: message.id,
      from,
      subject,
      receivedAt: message.internalDate.toISOString(),
      body,
      isHtml: HTML_MARKUP_PATTERN.test(body),
    };
  }

  async listGmailMessages(
    userId: string,
    query: ListGmailMessagesQuery,
  ): Promise<ListGmailMessagesResponse> {
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));

    if (query.status !== undefined && !VALID_STATUSES.has(query.status)) {
      throw new BadRequestException(`Invalid status: ${query.status}`);
    }

    const where = {
      userId,
      ...(query.status ? { status: query.status as SyncStatus } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.client.gmailMessage.findMany({
        where,
        orderBy: { internalDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          internalDate: true,
          updatedAt: true,
          header: true,
          transaction: { select: { id: true } },
        },
      }),
      this.prisma.client.gmailMessage.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.toDto(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async retryGmailMessages(
    userId: string,
    ids: string[],
  ): Promise<RetryGmailMessagesResponse> {
    if (!isAiParsingEnabled()) {
      throw new ServiceUnavailableException(
        'AI email parsing is temporarily disabled. Re-run is unavailable.',
      );
    }

    if (ids.length === 0) {
      throw new BadRequestException('At least one message id is required');
    }

    const uniqueIds = [...new Set(ids)];

    const messages = await this.prisma.client.gmailMessage.findMany({
      where: {
        userId,
        id: { in: uniqueIds },
      },
      select: { id: true },
    });

    const requeuedIds = messages.map((message) => message.id);
    const requeuedSet = new Set(requeuedIds);
    const skipped = uniqueIds.filter((id) => !requeuedSet.has(id));

    if (requeuedIds.length > 0) {
      await this.prisma.client.$transaction([
        this.prisma.client.transaction.deleteMany({
          where: { gmailMessageId: { in: requeuedIds } },
        }),
        this.prisma.client.gmailMessage.updateMany({
          where: { id: { in: requeuedIds } },
          data: { status: JOB_STATUS.PENDING as SyncStatus },
        }),
      ]);

      for (const id of requeuedIds) {
        try {
          this.rabbitMqPublisher.publishGmailMessage(id);
        } catch (error) {
          this.logger.error(
            `Failed to publish Gmail message ${id} to RabbitMQ`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }

    return { requeued: requeuedIds, skipped };
  }

  private toDto(row: {
    id: string;
    status: SyncStatus;
    internalDate: Date;
    updatedAt: Date;
    header: string;
    transaction: { id: string } | null;
  }): GmailMessageDto {
    const { from, subject } = this.parseHeader(row.header);

    return {
      id: row.id,
      status: row.status,
      internalDate: row.internalDate.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      from,
      subject,
      hasTransaction: row.transaction !== null,
    };
  }

  private parseHeader(header: string): { from: string; subject: string } {
    const fromMatch = header.match(/From:\s*(.*?)\s*\|\s*Subject:/);
    const subjectMatch = header.match(/Subject:\s*(.*?)\s*\|\s*Date:/);

    return {
      from: fromMatch?.[1]?.trim() ?? '',
      subject: subjectMatch?.[1]?.trim() ?? header,
    };
  }
}
