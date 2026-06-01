import { Injectable } from '@nestjs/common';
import { EmailSyncStatus } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import type {
  CreateSyncJobResponse,
  LatestSyncStatusResponse,
} from './sync.types';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) { }

  async createSyncJob(userId: string): Promise<CreateSyncJobResponse> {
    const job = await this.prisma.client.emailSync.create({
      data: {
        userId,
        status: EmailSyncStatus.PENDING,
      },
      select: { id: true, status: true },
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
          status: EmailSyncStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      lastSyncStatus: (latestJob?.status as EmailSyncStatus | undefined) ?? null,
      lastSyncedTime: latestCompleted?.createdAt.toISOString() ?? null,
    };
  }
}
