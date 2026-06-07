import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JOB_STATUS } from '@repo/constant';
import type { SyncStatus } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import { RabbitMqPublisherService } from '../messaging/rabbitmq-publisher.service';
import type {
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

@Injectable()
export class GmailMessagesService {
  private readonly logger = new Logger(GmailMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMqPublisher: RabbitMqPublisherService,
  ) {}

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
          await this.rabbitMqPublisher.publishGmailMessage(id);
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
