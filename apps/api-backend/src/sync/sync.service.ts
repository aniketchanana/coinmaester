import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SyncStatus } from '@repo/database';

import { isAiParsingEnabled } from '../common/ai-parsing';
import { PrismaService } from '../database/prisma.service';
import { GmailIngestionService } from './gmail-ingestion.service';
import type {
  CreateSyncJobResponse,
  JobStatusCounts,
  JobStatusSummaryResponse,
  LatestSyncStatusResponse,
} from './sync.types';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmailIngestionService: GmailIngestionService,
  ) {}

  async createSyncJob(userId: string): Promise<CreateSyncJobResponse> {
    if (!isAiParsingEnabled()) {
      throw new ServiceUnavailableException(
        'AI email parsing is temporarily disabled. Sync is unavailable.',
      );
    }

    const gmailAccounts = await this.prisma.client.gmailAccount.findMany({
      where: { userId },
      select: { id: true },
    });

    if (gmailAccounts.length === 0) {
      throw new BadRequestException(
        'No linked Gmail accounts found. Please sign in again with Google.',
      );
    }

    const jobs = await this.prisma.client.$transaction(
      gmailAccounts.map((gmailAccount) =>
        this.prisma.client.emailSync.create({
          data: {
            userId,
            gmailAccountId: gmailAccount.id,
            status: SyncStatus.IN_PROGRESS,
          },
          select: { id: true, status: true },
        }),
      ),
    );

    for (const job of jobs) {
      void this.gmailIngestionService.processJob(job.id).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Sync failed for job ${job.id}: ${message}`);
      });
    }

    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        status: job.status,
      })),
    };
  }

  async getLatestSyncStatus(userId: string): Promise<LatestSyncStatusResponse> {
    const [latestJob, latestCompleted] = await Promise.all([
      this.prisma.client.emailSync.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      }),
      this.prisma.client.emailSync.findFirst({
        where: {
          userId,
          status: SyncStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      lastSyncStatus: latestJob?.status ?? null,
      lastSyncedTime: latestCompleted?.createdAt.toISOString() ?? null,
    };
  }

  async getJobStatusSummary(
    userId: string,
  ): Promise<JobStatusSummaryResponse> {
    const [latest, activeSyncJobs, messageGroups] = await Promise.all([
      this.getLatestSyncStatus(userId),
      this.prisma.client.emailSync.count({
        where: {
          userId,
          status: {
            in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS],
          },
        },
      }),
      this.prisma.client.gmailMessage.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
    ]);

    const messages: JobStatusCounts = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const group of messageGroups) {
      const count = group._count._all;
      messages.total += count;
      switch (group.status) {
        case SyncStatus.PENDING:
          messages.pending = count;
          break;
        case SyncStatus.IN_PROGRESS:
          messages.inProgress = count;
          break;
        case SyncStatus.COMPLETED:
          messages.completed = count;
          break;
        case SyncStatus.FAILED:
          messages.failed = count;
          break;
      }
    }

    return {
      activeSyncJobs,
      lastSyncStatus: latest.lastSyncStatus,
      lastSyncedTime: latest.lastSyncedTime,
      messages,
      hasActiveWork:
        activeSyncJobs > 0 ||
        messages.pending > 0 ||
        messages.inProgress > 0,
    };
  }
}
