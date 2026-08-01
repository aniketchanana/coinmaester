import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SyncStatus } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import { GmailIngestionService } from './gmail-ingestion.service';
import type {
  CreateSyncJobResponse,
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
}
