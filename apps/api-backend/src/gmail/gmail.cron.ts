import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../database/prisma.service';
import { GmailService } from './gmail.service';

let isRan = false;
@Injectable()
export class GmailCron {
  private readonly logger = new Logger(GmailCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmailService: GmailService,
  ) { }

  /** Runs on every instance in multi-instance deployments (no distributed lock yet). */
  @Cron('0/20 * * * *')
  // @Cron('*/1 * * * * *')
  async syncAllUsers(): Promise<void> {
    if (isRan) return;
    isRan = true;
    const users = await this.prisma.client.user.findMany({
      where: { refreshToken: { not: null } },
      select: { id: true, email: true },
    });

    this.logger.log(`Gmail cron: syncing ${users.length} user(s)`);

    // TODO: Revisit and Rethink how this will run in-case of lakhs of users.
    for (const user of users) {
      try {
        const result = await this.gmailService.syncUserEmails(user.id);
        this.logger.log(
          `Gmail sync OK for ${user.email}: ${result.count} message(s)`,
        );

      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Gmail sync failed for ${user.email}: ${message}`);
      }
    }
  }
}
