import { BadRequestException, Injectable } from '@nestjs/common';
import { TRANSACTION_FILTER_TYPE } from '@repo/constant';
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
  type AnalyticsTopTransaction,
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

interface AnalyticsFilters {
  payee?: string;
  type?: AnalyticsQuery['type'];
  rangeStart: Date | null;
  rangeEnd: Date | null;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) { }

  async getAnalytics(
    userId: string,
    query: AnalyticsQuery,
  ): Promise<AnalyticsResponse> {
    const hasStart = Boolean(query.startDate?.trim());
    const hasEnd = Boolean(query.endDate?.trim());

    const rangeStart = hasStart
      ? this.startOfDay(this.parseDate(query.startDate!, 'startDate'))
      : null;
    const rangeEnd = hasEnd
      ? this.startOfDay(this.parseDate(query.endDate!, 'endDate'))
      : null;

    if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const filters: AnalyticsFilters = {
      payee: query.payee?.trim() || undefined,
      type: query.type,
      rangeStart,
      rangeEnd,
    };

    const isAllTime = rangeStart === null && rangeEnd === null;
    const granularity =
      this.parseGranularity(query.granularity) ??
      (isAllTime ? ANALYTICS_GRANULARITY.MONTH : ANALYTICS_GRANULARITY.DAY);
    const truncUnit =
      granularity === ANALYTICS_GRANULARITY.MONTH ? 'month' : 'day';

    const previousPeriod =
      rangeStart && rangeEnd
        ? this.previousPeriod(rangeStart, rangeEnd)
        : null;

    const [
      trends,
      currentSummary,
      previousSummary,
      payeeRows,
      bankRows,
      topTransactions,
    ] = await Promise.all([
      this.fetchTrends(userId, filters, truncUnit),
      this.fetchSummary(userId, filters),
      previousPeriod
        ? this.fetchSummary(userId, {
          ...filters,
          rangeStart: previousPeriod.prevStart,
          rangeEnd: previousPeriod.prevEnd,
        })
        : Promise.resolve(null),
      this.fetchBreakdown(userId, filters, 'payee'),
      this.fetchBreakdown(userId, filters, 'bank'),
      this.fetchTopTransactions(userId, filters),
    ]);

    const summary = this.toSummary(
      currentSummary,
      rangeStart,
      rangeEnd,
    );
    const comparison =
      previousSummary !== null
        ? this.toComparison(currentSummary, previousSummary)
        : null;
    const byPayee = this.toPayeeBreakdown(payeeRows);
    const byBank = this.toBankBreakdown(bankRows);
    const insights = this.buildInsights(summary, comparison, byPayee);

    return {
      summary,
      comparison,
      trends,
      breakdown: { byPayee, byBank },
      insights,
      topTransactions,
    };
  }

  private buildWhereSql(
    userId: string,
    filters: AnalyticsFilters,
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [
      Prisma.sql`"userId" = ${userId}`,
      Prisma.sql`"isDeleted" = false`,
    ];

    if (filters.rangeStart) {
      parts.push(Prisma.sql`"transactionDate" >= ${filters.rangeStart}`);
    }

    if (filters.rangeEnd) {
      parts.push(Prisma.sql`"transactionDate" <= ${filters.rangeEnd}`);
    }

    if (filters.payee) {
      parts.push(
        Prisma.sql`"paymentMadeTo" ILIKE ${`%${filters.payee}%`}`,
      );
    }

    if (filters.type === TRANSACTION_FILTER_TYPE.INVESTMENT) {
      parts.push(Prisma.sql`"isInvestment" = true`);
    } else if (
      filters.type === TRANSACTION_FILTER_TYPE.DEBIT ||
      filters.type === TRANSACTION_FILTER_TYPE.CREDIT
    ) {
      parts.push(Prisma.sql`"type" = ${filters.type}`);
      parts.push(Prisma.sql`"isInvestment" = false`);
    }

    return Prisma.join(parts, ' AND ');
  }

  private async fetchTrends(
    userId: string,
    filters: AnalyticsFilters,
    truncUnit: 'day' | 'month',
  ): Promise<AnalyticsTrendPoint[]> {
    const dateTrunc =
      truncUnit === ANALYTICS_GRANULARITY.MONTH
        ? Prisma.sql`DATE_TRUNC('month', "transactionDate")`
        : Prisma.sql`DATE_TRUNC('day', "transactionDate")`;
    const whereSql = this.buildWhereSql(userId, filters);

    const rows = await this.prisma.client.$queryRaw<TrendRow[]>`
      WITH filtered AS (
        SELECT
          "transactionDate",
          "transactionValue",
          "type",
          "isInvestment"
        FROM transactions
        WHERE ${whereSql}
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
    filters: AnalyticsFilters,
  ): Promise<SummaryRow> {
    const whereSql = this.buildWhereSql(userId, filters);

    const rows = await this.prisma.client.$queryRaw<SummaryRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'DEBIT' THEN "transactionValue" END), 0) AS total_debit,
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'CREDIT' THEN "transactionValue" END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN "isInvestment" THEN "transactionValue" END), 0) AS total_investment,
        COUNT(*)::bigint AS transaction_count
      FROM transactions
      WHERE ${whereSql}
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
    filters: AnalyticsFilters,
    dimension: 'payee' | 'bank',
  ): Promise<BreakdownRow[]> {
    const whereSql = this.buildWhereSql(userId, filters);
    const groupColumn =
      dimension === 'payee'
        ? Prisma.sql`"paymentMadeTo"`
        : Prisma.sql`"bankName"`;

    return this.prisma.client.$queryRaw<BreakdownRow[]>`
      SELECT
        ${groupColumn} AS label,
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'DEBIT' THEN "transactionValue" END), 0) AS debit,
        COALESCE(SUM(CASE WHEN NOT "isInvestment" AND "type" = 'CREDIT' THEN "transactionValue" END), 0) AS credit,
        COALESCE(SUM(CASE WHEN "isInvestment" THEN "transactionValue" END), 0) AS investment
      FROM transactions
      WHERE ${whereSql}
      GROUP BY ${groupColumn}
      ORDER BY debit DESC
      LIMIT 10
    `;
  }

  private async fetchTopTransactions(
    userId: string,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsTopTransaction[]> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      isDeleted: false,
    };

    if (filters.rangeStart || filters.rangeEnd) {
      where.transactionDate = {};
      if (filters.rangeStart) {
        where.transactionDate.gte = filters.rangeStart;
      }
      if (filters.rangeEnd) {
        where.transactionDate.lte = filters.rangeEnd;
      }
    }

    if (filters.payee) {
      where.paymentMadeTo = {
        contains: filters.payee,
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

    const rows = await this.prisma.client.transaction.findMany({
      where,
      orderBy: [{ transactionValue: 'desc' }, { id: 'asc' }],
      take: 5,
      select: {
        id: true,
        paymentMadeTo: true,
        bankName: true,
        transactionValue: true,
        type: true,
        isInvestment: true,
        transactionDate: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      paymentMadeTo: row.paymentMadeTo,
      bankName: row.bankName,
      transactionValue: row.transactionValue.toNumber(),
      type: row.type,
      isInvestment: row.isInvestment,
      transactionDate: row.transactionDate.toISOString().slice(0, 10),
    }));
  }

  private toSummary(
    row: SummaryRow,
    start: Date | null,
    end: Date | null,
  ): AnalyticsSummary {
    const totalDebit = this.decimalToNumber(row.total_debit);
    const totalCredit = this.decimalToNumber(row.total_credit);
    const totalInvestment = this.decimalToNumber(row.total_investment);

    let dayCount = 1;
    if (start && end) {
      dayCount = Math.max(1, this.inclusiveDayCount(start, end));
    }

    const netCashflow = totalCredit - totalDebit;
    const summary: AnalyticsSummary = {
      totalDebit,
      totalCredit,
      totalInvestment,
      netCashflow,
      estimatedBankBalance: netCashflow - totalInvestment,
      transactionCount: Number(row.transaction_count),
      ...(start && end ? { avgDailySpend: totalDebit / dayCount } : {}),
    };
    return summary;
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
    comparison: AnalyticsComparison | null,
    byPayee: AnalyticsPayeeBreakdown[],
  ): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (comparison?.debitChangePercent !== null && comparison) {
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
    const prevEnd = this.startOfDay(new Date(start.getTime() - dayMs));
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

  private parseGranularity(
    value?: AnalyticsGranularity,
  ): AnalyticsGranularity | undefined {
    if (!value) {
      return undefined;
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
}
