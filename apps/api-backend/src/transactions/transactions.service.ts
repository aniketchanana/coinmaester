import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TRANSACTION_TYPE } from '@repo/constant';
import type { Prisma, TransactionType } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import type {
  ListTransactionsResponse,
  TransactionDto,
  UpdateTransactionBody,
} from './transactions.types';

interface ListTransactionsQuery {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTransactions(
    userId: string,
    query: ListTransactionsQuery,
  ): Promise<ListTransactionsResponse> {
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const where = this.buildWhereClause(userId, query.startDate, query.endDate);

    const [rows, total, aggregates] = await Promise.all([
      this.prisma.client.transaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.transaction.count({ where }),
      this.prisma.client.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { transactionValue: true },
      }),
    ]);

    const totalDebit = this.sumForType(aggregates, TRANSACTION_TYPE.DEBIT);
    const totalCredit = this.sumForType(aggregates, TRANSACTION_TYPE.CREDIT);

    return {
      data: rows.map((row) => this.toDto(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      aggregate: {
        totalDebit,
        totalCredit,
      },
    };
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    body: UpdateTransactionBody,
  ): Promise<TransactionDto> {
    const existing = await this.findActiveTransaction(userId, transactionId);

    const data: Prisma.TransactionUpdateInput = {};

    if (body.bankName !== undefined) {
      data.bankName = body.bankName.trim();
    }

    if (body.transactionValue !== undefined) {
      data.transactionValue = body.transactionValue;
    }

    if (body.type !== undefined) {
      data.type = this.parseTransactionType(body.type);
    }

    if (body.transactionDate !== undefined) {
      data.transactionDate = this.parseTransactionDate(body.transactionDate);
    }

    if (body.paymentMadeTo !== undefined) {
      data.paymentMadeTo = body.paymentMadeTo.trim();
    }

    const updated = await this.prisma.client.transaction.update({
      where: { id: transactionId },
      data,
    });

    return this.toDto(updated);
  }

  async deleteTransaction(
    userId: string,
    transactionId: string,
  ): Promise<void> {
    await this.findActiveTransaction(userId, transactionId);

    await this.prisma.client.transaction.update({
      where: { id: transactionId },
      data: { isDeleted: true },
    });
  }

  private async findActiveTransaction(userId: string, transactionId: string) {
    const existing = await this.prisma.client.transaction.findFirst({
      where: { id: transactionId, userId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    return existing;
  }

  private buildWhereClause(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { userId, isDeleted: false };

    if (startDate || endDate) {
      where.transactionDate = {};

      if (startDate) {
        const parsed = this.parseTransactionDate(startDate);
        where.transactionDate.gte = this.startOfDay(parsed);
      }

      if (endDate) {
        const parsed = this.parseTransactionDate(endDate);
        where.transactionDate.lte = this.endOfDay(parsed);
      }
    }

    return where;
  }

  private sumForType(
    aggregates: Array<{
      type: TransactionType;
      _sum: { transactionValue: Prisma.Decimal | null };
    }>,
    type: TransactionType,
  ): number {
    const match = aggregates.find((row) => row.type === type);
    return match?._sum.transactionValue?.toNumber() ?? 0;
  }

  private toDto(row: {
    id: string;
    bankName: string;
    transactionValue: Prisma.Decimal;
    type: TransactionType;
    transactionDate: Date;
    paymentMadeTo: string;
    createdAt: Date;
    updatedAt: Date;
  }): TransactionDto {
    return {
      id: row.id,
      bankName: row.bankName,
      transactionValue: row.transactionValue.toNumber(),
      type: row.type,
      transactionDate: row.transactionDate.toISOString(),
      paymentMadeTo: row.paymentMadeTo,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
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

    throw new BadRequestException(`Invalid transaction type: ${value}`);
  }

  private parseTransactionDate(value: string): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid transaction date: ${value}`);
    }

    return parsed;
  }

  private startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }

  private endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setUTCHours(23, 59, 59, 999);
    return result;
  }
}
