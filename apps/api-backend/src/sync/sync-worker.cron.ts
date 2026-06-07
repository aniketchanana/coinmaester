import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JOB_STATUS } from '@repo/constant';
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
      let jobIds: string[];

      try {
        jobIds = await this.claimPendingJobs();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Unable to claim pending sync jobs: ${message}`);
        return;
      }

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
    // Single-statement claim avoids interactive $transaction, which can hit P2028
    // when the pool is busy during long-running Gmail ingestion work.
    const rows = await this.prisma.client.$queryRaw<PendingJobRow[]>`
      WITH claimed AS (
        SELECT id
        FROM "emailSync"
        WHERE status = ${JOB_STATUS.PENDING}::"SyncStatus"
        ORDER BY "createdAt" ASC
        LIMIT ${JOBS_PER_TICK}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "emailSync" AS es
      SET
        status = ${JOB_STATUS.IN_PROGRESS}::"SyncStatus",
        "updatedAt" = NOW()
      FROM claimed
      WHERE es.id = claimed.id
      RETURNING es.id
    `;

    return rows.map((row) => row.id);
  }
}
