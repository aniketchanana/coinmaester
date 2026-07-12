import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  TRANSACTION_FILTER_TYPE,
  type TransactionFilterType,
} from '@repo/constant';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import {
  ANALYTICS_GRANULARITY,
  type AnalyticsGranularity,
  type AnalyticsResponse,
} from './analytics.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  getAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('payee') payee?: string,
    @Query('type') type?: string,
    @Query('granularity') granularity?: string,
  ): Promise<AnalyticsResponse> {
    return this.analyticsService.getAnalytics(user.sub, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      payee: payee || undefined,
      type: this.parseTypeFilter(type),
      granularity: this.parseGranularity(granularity),
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

  private parseGranularity(value?: string): AnalyticsGranularity | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();

    if (
      normalized === ANALYTICS_GRANULARITY.DAY ||
      normalized === ANALYTICS_GRANULARITY.MONTH
    ) {
      return normalized;
    }

    return undefined;
  }
}
