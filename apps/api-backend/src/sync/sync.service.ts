import { Injectable, Logger } from '@nestjs/common';
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
    const job = await this.prisma.client.emailSync.create({
      data: {
        userId,
        status: SyncStatus.IN_PROGRESS,
      },
      select: { id: true, status: true },
    });

    void this.gmailIngestionService.processJob(job.id).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sync failed for job ${job.id}: ${message}`);
    });

    return {
      id: job.id,
      status: job.status,
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
