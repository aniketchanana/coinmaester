import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  TRANSACTION_SORT_FIELD,
  TRANSACTION_SORT_ORDER,
  TransactionsService,
} from './transactions.service';
import {
  TRANSACTION_FILTER_TYPE,
  type TransactionFilterType,
} from '@repo/constant';

import type {
  CreateTransactionBody,
  ListTransactionsResponse,
  TransactionDto,
  UpdateTransactionBody,
} from './transactions.types';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  listTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('payee') payee?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<ListTransactionsResponse> {
    return this.transactionsService.listTransactions(user.sub, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      payee: payee || undefined,
      type: this.parseTypeFilter(type),
      sortBy: this.parseSortBy(sortBy),
      sortOrder: this.parseSortOrder(sortOrder),
    });
  }

  private parseTypeFilter(value?: string): TransactionFilterType | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase();

    if (
      normalized === TRANSACTION_FILTER_TYPE.DEBIT ||
      normalized === TRANSACTION_FILTER_TYPE.CREDIT ||
      normalized === TRANSACTION_FILTER_TYPE.INVESTMENT
    ) {
      return normalized as TransactionFilterType;
    }

    return undefined;
  }

  private parseSortBy(
    value?: string,
  ):
    | (typeof TRANSACTION_SORT_FIELD)[keyof typeof TRANSACTION_SORT_FIELD]
    | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    const normalized = value.trim();

    if (
      normalized === TRANSACTION_SORT_FIELD.TRANSACTION_DATE ||
      normalized === TRANSACTION_SORT_FIELD.TRANSACTION_VALUE
    ) {
      return normalized;
    }

    return undefined;
  }

  private parseSortOrder(
    value?: string,
  ):
    | (typeof TRANSACTION_SORT_ORDER)[keyof typeof TRANSACTION_SORT_ORDER]
    | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();

    if (
      normalized === TRANSACTION_SORT_ORDER.ASC ||
      normalized === TRANSACTION_SORT_ORDER.DESC
    ) {
      return normalized;
    }

    return undefined;
  }

  @Post()
  createTransaction(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateTransactionBody,
  ): Promise<TransactionDto> {
    return this.transactionsService.createTransaction(user.sub, body);
  }

  @Patch(':id')
  updateTransaction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: UpdateTransactionBody,
  ): Promise<TransactionDto> {
    return this.transactionsService.updateTransaction(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTransaction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.transactionsService.deleteTransaction(user.sub, id);
  }
}
