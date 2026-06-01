import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JOB_STATUS } from '@repo/constant';
import type { EmailSyncStatus } from '@repo/database';

import { PrismaService } from '../database/prisma.service';

const ZOMBIE_THRESHOLD_MS = 60 * 60 * 1000;

@Injectable()
export class SyncCleanupCron {
  private readonly logger = new Logger(SyncCleanupCron.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron('0 0 */2 * * *')
  async markStaleJobsFailed(): Promise<void> {
    const staleBefore = new Date(Date.now() - ZOMBIE_THRESHOLD_MS);

    const result = await this.prisma.client.emailSync.updateMany({
      where: {
        status: JOB_STATUS.IN_PROGRESS as EmailSyncStatus,
        updatedAt: { lt: staleBefore },
      },
      data: { status: JOB_STATUS.FAILED as EmailSyncStatus },
    });

    if (result.count > 0) {
      this.logger.warn(
        `Marked ${result.count} stale IN_PROGRESS sync job(s) as FAILED`,
      );
    }
  }
}
