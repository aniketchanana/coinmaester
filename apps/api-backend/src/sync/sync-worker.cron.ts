import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JOB_STATUS } from '@repo/constant';
import type { EmailSyncStatus } from '@repo/database';

import { GmailIngestionService } from './gmail-ingestion.service';
import { PrismaService } from '../database/prisma.service';

const JOBS_PER_TICK = 10;

interface PendingJobRow {
  id: string;
}

@Injectable()
export class SyncWorkerCron {
  private readonly logger = new Logger(SyncWorkerCron.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmailIngestionService: GmailIngestionService,
  ) {}

  @Cron('*/10 * * * * *')
  async processPendingJobs(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const jobIds = await this.claimPendingJobs();

      for (const jobId of jobIds) {
        try {
          await this.gmailIngestionService.processJob(jobId);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Sync worker failed for job ${jobId}: ${message}`);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async claimPendingJobs(): Promise<string[]> {
    return this.prisma.client.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<PendingJobRow[]>`
        SELECT id
        FROM "emailSync"
        WHERE status = ${JOB_STATUS.PENDING}::"EmailSyncStatus"
        ORDER BY "createdAt" ASC
        LIMIT ${JOBS_PER_TICK}
        FOR UPDATE SKIP LOCKED
      `;

      const jobIds = rows.map((row) => row.id);

      if (jobIds.length === 0) {
        return [];
      }

      await tx.emailSync.updateMany({
        where: { id: { in: jobIds } },
        data: { status: JOB_STATUS.IN_PROGRESS as EmailSyncStatus },
      });

      return jobIds;
    });
  }
}
