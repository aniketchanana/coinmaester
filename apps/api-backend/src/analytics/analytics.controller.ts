import { Controller, Get, Query, UseGuards } from '@nestjs/common';

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
    @Query('granularity') granularity?: string,
  ): Promise<AnalyticsResponse> {
    return this.analyticsService.getAnalytics(user.sub, {
      startDate: startDate ?? '',
      endDate: endDate ?? '',
      granularity: this.parseGranularity(granularity),
    });
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
