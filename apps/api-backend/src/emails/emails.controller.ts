import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { PrismaClient } from '@repo/database';

import { PRISMA } from '../app.module';
import { InternalApiGuard } from '../auth/internal-api.guard';

@Controller('emails')
@UseGuards(InternalApiGuard)
export class EmailsController {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  @Get()
  async listEmails(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    return this.prisma.emailMessage.findMany({
      where: { userId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  @Get('sync/status')
  async syncStatus(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    const state = await this.prisma.gmailSyncState.findUnique({
      where: { userId },
    });

    return {
      lastSyncedAt: state?.lastSyncedAt ?? null,
    };
  }
}
