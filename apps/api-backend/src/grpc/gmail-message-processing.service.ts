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
  transaction?: Record<string, unknown>;
  failureReason?: string;
}

@Injectable()
export class GmailMessageProcessingService {
  constructor(private readonly prisma: PrismaService) {}

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

  async completeProcessing(payload: CompleteProcessingPayload): Promise<{
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
      return this.completeWithoutTransaction(gmailMessageId);
    }

    const normalized = this.normalizeTransaction(transaction);

    if (!this.shouldPersistTransaction(normalized)) {
      return this.completeWithoutTransaction(gmailMessageId);
    }

    const parsed = this.tryParsePersistableTransaction(normalized);
    if (!parsed) {
      return this.completeWithoutTransaction(gmailMessageId);
    }

    try {
      const updated = await this.prisma.client.$transaction(async (tx) => {
        const paymentMadeTo = normalized.paymentMadeTo?.trim() || '--';

        await tx.transaction.create({
          data: {
            userId: message.userId,
            gmailMessageId,
            bankName: normalized.bankName.trim() || '--',
            transactionValue: new Prisma.Decimal(normalized.transactionValue),
            type: parsed.type,
            transactionDate: parsed.date,
            paymentMadeTo,
            isInvestment: false,
          },
        });

        return tx.gmailMessage.update({
          where: { id: gmailMessageId },
          data: { status: JOB_STATUS.COMPLETED as SyncStatus },
        });
      });

      return {
        id: updated.id,
        status: updated.status,
      };
    } catch {
      return this.completeWithoutTransaction(gmailMessageId);
    }
  }

  private shouldPersistTransaction(
    transaction: ExtractedTransactionPayload,
  ): boolean {
    return transaction.isTransactionEmail && transaction.transactionValue > 0;
  }

  private normalizeTransaction(
    transaction: Record<string, unknown>,
  ): ExtractedTransactionPayload {
    const readString = (primary: unknown, fallback: unknown): string => {
      const value = primary ?? fallback;
      return typeof value === 'string' ? value : '';
    };

    const readNumber = (primary: unknown, fallback: unknown): number => {
      const value = primary ?? fallback;
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    };

    const readBoolean = (primary: unknown, fallback: unknown): boolean =>
      (primary ?? fallback) === true;

    return {
      bankName: readString(transaction.bankName, transaction.bank_name),
      transactionValue: readNumber(
        transaction.transactionValue,
        transaction.transaction_value,
      ),
      type: readString(transaction.type, transaction.type),
      transactionDate: readString(
        transaction.transactionDate,
        transaction.transaction_date,
      ),
      paymentMadeTo: readString(
        transaction.paymentMadeTo,
        transaction.payment_made_to,
      ),
      isTransactionEmail: readBoolean(
        transaction.isTransactionEmail,
        transaction.is_transaction_email,
      ),
    };
  }

  private async completeWithoutTransaction(gmailMessageId: string): Promise<{
    id: string;
    status: string;
  }> {
    const updated = await this.prisma.client.gmailMessage.update({
      where: { id: gmailMessageId },
      data: { status: JOB_STATUS.COMPLETED as SyncStatus },
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  private tryParsePersistableTransaction(
    transaction: ExtractedTransactionPayload,
  ): { type: TransactionType; date: Date } | null {
    const type = this.tryParseTransactionType(transaction.type);
    const date = this.tryParseTransactionDate(transaction.transactionDate);
    if (!type || !date) {
      return null;
    }

    return { type, date };
  }

  private tryParseTransactionType(value: string): TransactionType | null {
    if (!value.trim()) {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    if (
      normalized === TRANSACTION_TYPE.DEBIT ||
      normalized === TRANSACTION_TYPE.CREDIT
    ) {
      return normalized as TransactionType;
    }

    return null;
  }

  private tryParseTransactionDate(value: string): Date | null {
    if (!value.trim()) {
      return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }
}
