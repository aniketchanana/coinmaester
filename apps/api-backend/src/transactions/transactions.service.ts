import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TRANSACTION_FILTER_TYPE,
  TRANSACTION_NOTES_MAX_LENGTH,
  TRANSACTION_TYPE,
  type TransactionFilterType,
} from '@repo/constant';
import type { Prisma, TransactionType } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import type {
  CreateTransactionBody,
  ListTransactionsResponse,
  TransactionDto,
  UpdateTransactionBody,
} from './transactions.types';

export const TRANSACTION_SORT_FIELD = {
  TRANSACTION_DATE: 'transactionDate',
  TRANSACTION_VALUE: 'transactionValue',
} as const;

export type TransactionSortField =
  (typeof TRANSACTION_SORT_FIELD)[keyof typeof TRANSACTION_SORT_FIELD];

export const TRANSACTION_SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type TransactionSortOrder =
  (typeof TRANSACTION_SORT_ORDER)[keyof typeof TRANSACTION_SORT_ORDER];

interface ListTransactionsQuery {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  payee?: string;
  type?: TransactionFilterType;
  sortBy?: TransactionSortField;
  sortOrder?: TransactionSortOrder;
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
    const where = this.buildWhereClause(userId, {
      startDate: query.startDate,
      endDate: query.endDate,
      payee: query.payee,
      type: query.type,
    });
    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    const nonInvestmentWhere: Prisma.TransactionWhereInput = {
      ...where,
      isInvestment: false,
    };

    const [rows, total, aggregates, investmentAggregate] = await Promise.all([
      this.prisma.client.transaction.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.transaction.count({ where }),
      this.prisma.client.transaction.groupBy({
        by: ['type'],
        where: nonInvestmentWhere,
        _sum: { transactionValue: true },
      }),
      this.prisma.client.transaction.aggregate({
        where: { ...where, isInvestment: true },
        _sum: { transactionValue: true },
      }),
    ]);

    const totalDebit = this.sumForType(aggregates, TRANSACTION_TYPE.DEBIT);
    const totalCredit = this.sumForType(aggregates, TRANSACTION_TYPE.CREDIT);
    const totalInvestment =
      investmentAggregate._sum.transactionValue?.toNumber() ?? 0;

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
        totalInvestment,
      },
    };
  }

  async createTransaction(
    userId: string,
    body: CreateTransactionBody,
  ): Promise<TransactionDto> {
    const bankName = body.bankName?.trim();
    if (!bankName) {
      throw new BadRequestException('Bank name is required');
    }

    const paymentMadeTo = body.paymentMadeTo?.trim();
    if (!paymentMadeTo) {
      throw new BadRequestException('Payee is required');
    }

    if (
      body.transactionValue === undefined ||
      body.transactionValue === null ||
      Number.isNaN(body.transactionValue) ||
      body.transactionValue <= 0
    ) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const type = this.parseTransactionType(body.type);
    const transactionDate = this.parseTransactionDate(body.transactionDate);

    let notes: string | null = null;
    if (body.notes !== undefined) {
      if (body.notes.length > TRANSACTION_NOTES_MAX_LENGTH) {
        throw new BadRequestException(
          `Notes must be at most ${TRANSACTION_NOTES_MAX_LENGTH} characters`,
        );
      }

      notes = body.notes.trim() || null;
    }

    const created = await this.prisma.client.transaction.create({
      data: {
        userId,
        bankName,
        transactionValue: body.transactionValue,
        type,
        transactionDate,
        paymentMadeTo,
        notes,
        isInvestment: body.isInvestment ?? false,
      },
    });

    return this.toDto(created);
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    body: UpdateTransactionBody,
  ): Promise<TransactionDto> {
    await this.findActiveTransaction(userId, transactionId);

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

    if (body.notes !== undefined) {
      if (body.notes.length > TRANSACTION_NOTES_MAX_LENGTH) {
        throw new BadRequestException(
          `Notes must be at most ${TRANSACTION_NOTES_MAX_LENGTH} characters`,
        );
      }

      data.notes = body.notes.trim() || null;
    }

    if (body.isInvestment !== undefined) {
      data.isInvestment = body.isInvestment;
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
    filters: {
      startDate?: string;
      endDate?: string;
      payee?: string;
      type?: TransactionFilterType;
    },
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { userId, isDeleted: false };

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};

      if (filters.startDate) {
        const parsed = this.parseTransactionDate(filters.startDate);
        where.transactionDate.gte = this.startOfDay(parsed);
      }

      if (filters.endDate) {
        const parsed = this.parseTransactionDate(filters.endDate);
        where.transactionDate.lte = this.endOfDay(parsed);
      }
    }

    const payee = filters.payee?.trim();
    if (payee) {
      where.paymentMadeTo = {
        contains: payee,
        mode: 'insensitive',
      };
    }

    if (filters.type === TRANSACTION_FILTER_TYPE.INVESTMENT) {
      where.isInvestment = true;
    } else if (
      filters.type === TRANSACTION_FILTER_TYPE.DEBIT ||
      filters.type === TRANSACTION_FILTER_TYPE.CREDIT
    ) {
      where.type = filters.type;
      where.isInvestment = false;
    }

    return where;
  }

  private buildOrderBy(
    sortBy?: TransactionSortField,
    sortOrder?: TransactionSortOrder,
  ): Prisma.TransactionOrderByWithRelationInput[] {
    const order =
      sortOrder === TRANSACTION_SORT_ORDER.ASC
        ? TRANSACTION_SORT_ORDER.ASC
        : TRANSACTION_SORT_ORDER.DESC;
    const field =
      sortBy === TRANSACTION_SORT_FIELD.TRANSACTION_VALUE
        ? TRANSACTION_SORT_FIELD.TRANSACTION_VALUE
        : TRANSACTION_SORT_FIELD.TRANSACTION_DATE;

    return [{ [field]: order }, { id: TRANSACTION_SORT_ORDER.ASC }];
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
    notes: string | null;
    isInvestment: boolean;
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
      notes: row.notes ?? null,
      isInvestment: row.isInvestment,
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
