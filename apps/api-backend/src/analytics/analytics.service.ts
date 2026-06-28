import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import {
  ANALYTICS_GRANULARITY,
  ANALYTICS_INSIGHT_TYPE,
  type AnalyticsBankBreakdown,
  type AnalyticsComparison,
  type AnalyticsGranularity,
  type AnalyticsInsight,
  type AnalyticsPayeeBreakdown,
  type AnalyticsQuery,
  type AnalyticsResponse,
  type AnalyticsSummary,
  type AnalyticsTrendPoint,
} from './analytics.types';

interface TrendRow {
  bucket: Date;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  investment: Prisma.Decimal;
  count: number;
  cumulative_debit: Prisma.Decimal;
  cumulative_credit: Prisma.Decimal;
  cumulative_investment: Prisma.Decimal;
}

interface SummaryRow {
  total_debit: Prisma.Decimal | null;
  total_credit: Prisma.Decimal | null;
  total_investment: Prisma.Decimal | null;
  transaction_count: bigint;
}

interface BreakdownRow {
  label: string;
  debit: Prisma.Decimal | null;
  credit: Prisma.Decimal | null;
  investment: Prisma.Decimal | null;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(
    userId: string,
    query: AnalyticsQuery,
  ): Promise<AnalyticsResponse> {
    const startDate = this.parseDate(query.startDate, 'startDate');
    const endDate = this.parseDate(query.endDate, 'endDate');
    const granularity = this.parseGranularity(query.granularity);

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const rangeStart = this.startOfDay(startDate);
    const rangeEnd = this.endOfDay(endDate);
    const { prevStart, prevEnd } = this.previousPeriod(rangeStart, rangeEnd);

    const truncUnit =
      granularity === ANALYTICS_GRANULARITY.MONTH ? 'month' : 'day';

    const [trends, currentSummary, previousSummary, payeeRows, bankRows] =
      await Promise.all([
        this.fetchTrends(userId, rangeStart, rangeEnd, truncUnit),
        this.fetchSummary(userId, rangeStart, rangeEnd),
        this.fetchSummary(userId, prevStart, prevEnd),
        this.fetchBreakdown(userId, rangeStart, rangeEnd, 'payee'),
        this.fetchBreakdown(userId, rangeStart, rangeEnd, 'bank'),
      ]);

    const summary = this.toSummary(currentSummary, rangeStart, rangeEnd);
    const comparison = this.toComparison(currentSummary, previousSummary);
    const byPayee = this.toPayeeBreakdown(payeeRows);
    const byBank = this.toBankBreakdown(bankRows);
    const insights = this.buildInsights(summary, comparison, byPayee);

    return {
      summary,
      comparison,
      trends,
      breakdown: { byPayee, byBank },
      insights,
    };
  }

  private async fetchTrends(
    userId: string,
    start: Date,
    end: Date,
    truncUnit: 'day' | 'month',
  ): Promise<AnalyticsTrendPoint[]> {
    const dateTrunc =
      truncUnit === ANALYTICS_GRANULARITY.MONTH
        ? Prisma.sql`DATE_TRUNC('month', "transactionDate")`
        : Prisma.sql`DATE_TRUNC('day', "transactionDate")`;

    const rows = await this.prisma.client.$queryRaw<TrendRow[]>`
      WITH filtered AS (
        SELECT
          "transactionDate",
          "transactionValue",
          "type",
          "isInvestment"
        FROM transactions
        WHERE "userId" = ${userId}
          AND "isDeleted" = false
          AND "transactionDate" >= ${start}
          AND "transactionDate" <= ${end}
      ),
      daily AS (
        SELECT
          ${dateTrunc} AS bucket,
          COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'DEBIT' THEN "transactionValue" END), 0) AS debit,
          COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'CREDIT' THEN "transactionValue" END), 0) AS credit,
          COALESCE(SUM(CASE WHEN "isInvestment" THEN "transactionValue" END), 0) AS investment,
          COUNT(*)::int AS count
        FROM filtered
        GROUP BY 1
      )
      SELECT
        bucket,
        debit,
        credit,
        investment,
        count,
        SUM(debit) OVER (ORDER BY bucket ROWS UNBOUNDED PRECEDING) AS cumulative_debit,
        SUM(credit) OVER (ORDER BY bucket ROWS UNBOUNDED PRECEDING) AS cumulative_credit,
        SUM(investment) OVER (ORDER BY bucket ROWS UNBOUNDED PRECEDING) AS cumulative_investment
      FROM daily
      ORDER BY bucket ASC
    `;

    return rows.map((row) => ({
      date: row.bucket.toISOString(),
      debit: this.decimalToNumber(row.debit),
      credit: this.decimalToNumber(row.credit),
      investment: this.decimalToNumber(row.investment),
      count: row.count,
      cumulativeDebit: this.decimalToNumber(row.cumulative_debit),
      cumulativeCredit: this.decimalToNumber(row.cumulative_credit),
      cumulativeInvestment: this.decimalToNumber(row.cumulative_investment),
    }));
  }

  private async fetchSummary(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<SummaryRow> {
    const rows = await this.prisma.client.$queryRaw<SummaryRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'DEBIT' THEN "transactionValue" END), 0) AS total_debit,
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'CREDIT' THEN "transactionValue" END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN "isInvestment" THEN "transactionValue" END), 0) AS total_investment,
        COUNT(*)::bigint AS transaction_count
      FROM transactions
      WHERE "userId" = ${userId}
        AND "isDeleted" = false
        AND "transactionDate" >= ${start}
        AND "transactionDate" <= ${end}
    `;

    return (
      rows[0] ?? {
        total_debit: new Prisma.Decimal(0),
        total_credit: new Prisma.Decimal(0),
        total_investment: new Prisma.Decimal(0),
        transaction_count: BigInt(0),
      }
    );
  }

  private async fetchBreakdown(
    userId: string,
    start: Date,
    end: Date,
    dimension: 'payee' | 'bank',
  ): Promise<BreakdownRow[]> {
    if (dimension === 'payee') {
      return this.prisma.client.$queryRaw<BreakdownRow[]>`
        SELECT
          "paymentMadeTo" AS label,
          COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'DEBIT' THEN "transactionValue" END), 0) AS debit,
          COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'CREDIT' THEN "transactionValue" END), 0) AS credit,
          COALESCE(SUM(CASE WHEN "isInvestment" THEN "transactionValue" END), 0) AS investment
        FROM transactions
        WHERE "userId" = ${userId}
          AND "isDeleted" = false
          AND "transactionDate" >= ${start}
          AND "transactionDate" <= ${end}
        GROUP BY "paymentMadeTo"
        ORDER BY debit DESC
        LIMIT 10
      `;
    }

    return this.prisma.client.$queryRaw<BreakdownRow[]>`
      SELECT
        "bankName" AS label,
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'DEBIT' THEN "transactionValue" END), 0) AS debit,
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'CREDIT' THEN "transactionValue" END), 0) AS credit,
        COALESCE(SUM(CASE WHEN "isInvestment" THEN "transactionValue" END), 0) AS investment
      FROM transactions
      WHERE "userId" = ${userId}
        AND "isDeleted" = false
        AND "transactionDate" >= ${start}
        AND "transactionDate" <= ${end}
      GROUP BY "bankName"
      ORDER BY debit DESC
      LIMIT 10
    `;
  }

  private toSummary(row: SummaryRow, start: Date, end: Date): AnalyticsSummary {
    const totalDebit = this.decimalToNumber(row.total_debit);
    const totalCredit = this.decimalToNumber(row.total_credit);
    const totalInvestment = this.decimalToNumber(row.total_investment);
    const dayCount = Math.max(1, this.inclusiveDayCount(start, end));

    const netCashflow = totalCredit - totalDebit;

    return {
      totalDebit,
      totalCredit,
      totalInvestment,
      netCashflow,
      estimatedBankBalance: netCashflow - totalInvestment,
      transactionCount: Number(row.transaction_count),
      avgDailySpend: totalDebit / dayCount,
    };
  }

  private toComparison(
    current: SummaryRow,
    previous: SummaryRow,
  ): AnalyticsComparison {
    const totalDebit = this.decimalToNumber(previous.total_debit);
    const totalCredit = this.decimalToNumber(previous.total_credit);
    const totalInvestment = this.decimalToNumber(previous.total_investment);
    const netCashflow = totalCredit - totalDebit;

    const currentDebit = this.decimalToNumber(current.total_debit);
    const currentCredit = this.decimalToNumber(current.total_credit);
    const currentInvestment = this.decimalToNumber(current.total_investment);
    const currentNet = currentCredit - currentDebit;

    return {
      totalDebit,
      totalCredit,
      totalInvestment,
      netCashflow,
      debitChangePercent: this.percentChange(totalDebit, currentDebit),
      creditChangePercent: this.percentChange(totalCredit, currentCredit),
      investmentChangePercent: this.percentChange(
        totalInvestment,
        currentInvestment,
      ),
      netCashflowChangePercent: this.percentChange(netCashflow, currentNet),
    };
  }

  private toPayeeBreakdown(rows: BreakdownRow[]): AnalyticsPayeeBreakdown[] {
    return rows.map((row) => {
      const debit = this.decimalToNumber(row.debit);
      const credit = this.decimalToNumber(row.credit);
      const investment = this.decimalToNumber(row.investment);

      return {
        payee: row.label,
        debit,
        credit,
        investment,
        total: debit + credit + investment,
      };
    });
  }

  private toBankBreakdown(rows: BreakdownRow[]): AnalyticsBankBreakdown[] {
    return rows.map((row) => {
      const debit = this.decimalToNumber(row.debit);
      const credit = this.decimalToNumber(row.credit);
      const investment = this.decimalToNumber(row.investment);

      return {
        bankName: row.label,
        debit,
        credit,
        investment,
        total: debit + credit + investment,
      };
    });
  }

  private buildInsights(
    summary: AnalyticsSummary,
    comparison: AnalyticsComparison,
    byPayee: AnalyticsPayeeBreakdown[],
  ): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (comparison.debitChangePercent !== null) {
      if (comparison.debitChangePercent > 5) {
        insights.push({
          type: ANALYTICS_INSIGHT_TYPE.SPEND_INCREASE,
          message: `Spending is up ${Math.round(comparison.debitChangePercent)}% compared to the previous period.`,
          value: comparison.debitChangePercent,
        });
      } else if (comparison.debitChangePercent < -5) {
        insights.push({
          type: ANALYTICS_INSIGHT_TYPE.SPEND_DECREASE,
          message: `Spending is down ${Math.abs(Math.round(comparison.debitChangePercent))}% compared to the previous period.`,
          value: comparison.debitChangePercent,
        });
      }
    }

    const topPayee = byPayee[0];
    if (topPayee && topPayee.debit > 0) {
      insights.push({
        type: ANALYTICS_INSIGHT_TYPE.TOP_PAYEE,
        message: `Top merchant by spend: ${topPayee.payee}.`,
        value: topPayee.debit,
      });
    }

    const outflow = summary.totalDebit + summary.totalInvestment;
    if (outflow > 0 && summary.totalInvestment > 0) {
      const share = (summary.totalInvestment / outflow) * 100;
      insights.push({
        type: ANALYTICS_INSIGHT_TYPE.INVESTMENT_SHARE,
        message: `Investments account for ${Math.round(share)}% of total outflow.`,
        value: share,
      });
    }

    if (summary.netCashflow >= 0) {
      insights.push({
        type: ANALYTICS_INSIGHT_TYPE.NET_POSITIVE,
        message: 'Net cashflow is positive for this period.',
        value: summary.netCashflow,
      });
    } else {
      insights.push({
        type: ANALYTICS_INSIGHT_TYPE.NET_NEGATIVE,
        message: 'Spending exceeded income for this period.',
        value: summary.netCashflow,
      });
    }

    return insights.slice(0, 4);
  }

  private previousPeriod(
    start: Date,
    end: Date,
  ): { prevStart: Date; prevEnd: Date } {
    const dayMs = 24 * 60 * 60 * 1000;
    const lengthDays = this.inclusiveDayCount(start, end);
    const prevEnd = this.endOfDay(new Date(start.getTime() - dayMs));
    const prevStart = this.startOfDay(
      new Date(prevEnd.getTime() - (lengthDays - 1) * dayMs),
    );

    return { prevStart, prevEnd };
  }

  private inclusiveDayCount(start: Date, end: Date): number {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  }

  private percentChange(previous: number, current: number): number | null {
    if (previous === 0) {
      return current === 0 ? 0 : null;
    }

    return ((current - previous) / Math.abs(previous)) * 100;
  }

  private decimalToNumber(value: Prisma.Decimal | null | undefined): number {
    if (!value) {
      return 0;
    }

    return value.toNumber();
  }

  private parseDate(value: string, field: string): Date {
    if (!value?.trim()) {
      throw new BadRequestException(`${field} is required`);
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${field}: ${value}`);
    }

    return parsed;
  }

  private parseGranularity(value?: AnalyticsGranularity): AnalyticsGranularity {
    if (!value) {
      return ANALYTICS_GRANULARITY.DAY;
    }

    if (
      value === ANALYTICS_GRANULARITY.DAY ||
      value === ANALYTICS_GRANULARITY.MONTH
    ) {
      return value;
    }

    throw new BadRequestException(
      `Invalid granularity: ${String(value)}. Use day or month.`,
    );
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
