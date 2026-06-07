import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { JOB_STATUS } from '@repo/constant';
import { RpcException } from '@nestjs/microservices';
import type { SyncStatus } from '@repo/database';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class GmailMessageProcessingService {
  constructor(private readonly prisma: PrismaService) {}

  async claimForProcessing(gmailMessageId: string): Promise<{
    id: string;
    header: string;
    status: string;
  }> {
    const message = await this.prisma.client.gmailMessage.findUnique({
      where: { id: gmailMessageId },
    });

    if (!message) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Gmail message ${gmailMessageId} not found`,
      });
    }

    if (message.status !== JOB_STATUS.PENDING) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: `Gmail message ${gmailMessageId} is not pending (status: ${message.status})`,
      });
    }

    const updated = await this.prisma.client.gmailMessage.update({
      where: { id: gmailMessageId },
      data: { status: JOB_STATUS.IN_PROGRESS as SyncStatus },
    });

    return {
      id: updated.id,
      header: updated.header,
      status: updated.status,
    };
  }

  async completeProcessing(gmailMessageId: string): Promise<{
    id: string;
    status: string;
  }> {
    const message = await this.prisma.client.gmailMessage.findUnique({
      where: { id: gmailMessageId },
    });

    if (!message) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Gmail message ${gmailMessageId} not found`,
      });
    }

    if (message.status !== JOB_STATUS.IN_PROGRESS) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: `Gmail message ${gmailMessageId} is not in progress (status: ${message.status})`,
      });
    }

    const updated = await this.prisma.client.gmailMessage.update({
      where: { id: gmailMessageId },
      data: { status: JOB_STATUS.COMPLETED as SyncStatus },
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }
}
