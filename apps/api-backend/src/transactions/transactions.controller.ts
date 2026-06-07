import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import type {
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
  ): Promise<ListTransactionsResponse> {
    return this.transactionsService.listTransactions(user.sub, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
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
