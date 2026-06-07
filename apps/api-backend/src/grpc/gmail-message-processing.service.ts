import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JOB_STATUS, TRANSACTION_TYPE } from '@repo/constant';
import type { SyncStatus, TransactionType } from '@repo/database';
import { Prisma } from '@repo/database';

import { PrismaService } from '../database/prisma.service';

interface ExtractedTransactionPayload {
  bankName: string;
  transactionValue: number;
  type: string;
  transactionDate: string;
  paymentMadeTo: string;
  isTransactionEmail: boolean;
}

interface CompleteProcessingPayload {
  gmailMessageId: string;
  transaction?: ExtractedTransactionPayload;
  failureReason?: string;
}

@Injectable()
export class GmailMessageProcessingService {
  constructor(private readonly prisma: PrismaService) { }

  async claimForProcessing(gmailMessageId: string): Promise<{
    id: string;
    header: string;
    status: string;
    emailBody: string;
    userId: string;
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

    if (
      message.status === JOB_STATUS.COMPLETED ||
      message.status === JOB_STATUS.FAILED
    ) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: `Gmail message ${gmailMessageId} is already terminal (status: ${message.status})`,
      });
    }

    // Allow reclaim when IN_PROGRESS so queue redelivery after a worker crash can resume.
    const updated = await this.prisma.client.gmailMessage.update({
      where: { id: gmailMessageId },
      data: { status: JOB_STATUS.IN_PROGRESS as SyncStatus },
    });

    return {
      id: updated.id,
      header: updated.header,
      status: updated.status,
      emailBody: updated.emailBody,
      userId: updated.userId,
    };
  }

  async completeProcessing(
    payload: CompleteProcessingPayload,
  ): Promise<{
    id: string;
    status: string;
  }> {
    const { gmailMessageId, transaction, failureReason } = payload;

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

    if (failureReason) {
      const updated = await this.prisma.client.gmailMessage.update({
        where: { id: gmailMessageId },
        data: { status: JOB_STATUS.FAILED as SyncStatus },
      });

      return {
        id: updated.id,
        status: updated.status,
      };
    }

    if (!transaction) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Transaction payload is required when no failure reason is provided',
      });
    }

    const transactionType = this.parseTransactionType(transaction.type);
    const transactionDate = this.parseTransactionDate(transaction.transactionDate);

    const updated = await this.prisma.client.$transaction(async (tx) => {
      if (transaction.transactionValue && transaction.isTransactionEmail) {
        await tx.transaction.create({
          data: {
            userId: message.userId,
            gmailMessageId,
            bankName: transaction.bankName.trim(),
            transactionValue: new Prisma.Decimal(transaction.transactionValue),
            type: transactionType,
            transactionDate,
            paymentMadeTo: transaction.paymentMadeTo.trim(),
          },
        });
      }

      return tx.gmailMessage.update({
        where: { id: gmailMessageId },
        data: { status: JOB_STATUS.COMPLETED as SyncStatus },
      });
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  private parseTransactionType(value: string): TransactionType {
    const normalized = value.trim().toUpperCase();

    if (
      normalized === TRANSACTION_TYPE.DEBIT ||
      normalized === TRANSACTION_TYPE.CREDIT
    ) {
      return normalized as TransactionType;
    }

    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: `Invalid transaction type: ${value}`,
    });
  }

  private parseTransactionDate(value: string): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: `Invalid transaction date: ${value}`,
      });
    }

    return parsed;
  }
}
