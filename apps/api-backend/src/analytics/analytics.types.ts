import type { TransactionFilterType, TransactionType } from '@repo/constant';

export const ANALYTICS_GRANULARITY = {
  DAY: 'day',
  MONTH: 'month',
} as const;

export type AnalyticsGranularity =
  (typeof ANALYTICS_GRANULARITY)[keyof typeof ANALYTICS_GRANULARITY];

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  payee?: string;
  type?: TransactionFilterType;
  granularity?: AnalyticsGranularity;
}

export interface AnalyticsSummary {
  totalDebit: number;
  totalCredit: number;
  totalInvestment: number;
  netCashflow: number;
  estimatedBankBalance: number;
  transactionCount: number;
  avgDailySpend: number;
}

export interface AnalyticsComparison {
  totalDebit: number;
  totalCredit: number;
  totalInvestment: number;
  netCashflow: number;
  debitChangePercent: number | null;
  creditChangePercent: number | null;
  investmentChangePercent: number | null;
  netCashflowChangePercent: number | null;
}

export interface AnalyticsTrendPoint {
  date: string;
  debit: number;
  credit: number;
  investment: number;
  count: number;
  cumulativeDebit: number;
  cumulativeCredit: number;
  cumulativeInvestment: number;
}

export interface AnalyticsPayeeBreakdown {
  payee: string;
  debit: number;
  credit: number;
  investment: number;
  total: number;
}

export interface AnalyticsBankBreakdown {
  bankName: string;
  debit: number;
  credit: number;
  investment: number;
  total: number;
}

export interface AnalyticsTopTransaction {
  id: string;
  paymentMadeTo: string;
  bankName: string;
  transactionValue: number;
  type: TransactionType;
  isInvestment: boolean;
  transactionDate: string;
}

export const ANALYTICS_INSIGHT_TYPE = {
  SPEND_INCREASE: 'spend_increase',
  SPEND_DECREASE: 'spend_decrease',
  TOP_PAYEE: 'top_payee',
  INVESTMENT_SHARE: 'investment_share',
  NET_POSITIVE: 'net_positive',
  NET_NEGATIVE: 'net_negative',
} as const;

export type AnalyticsInsightType =
  (typeof ANALYTICS_INSIGHT_TYPE)[keyof typeof ANALYTICS_INSIGHT_TYPE];

export interface AnalyticsInsight {
  type: AnalyticsInsightType;
  message: string;
  value?: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  comparison: AnalyticsComparison | null;
  trends: AnalyticsTrendPoint[];
  breakdown: {
    byPayee: AnalyticsPayeeBreakdown[];
    byBank: AnalyticsBankBreakdown[];
  };
  insights: AnalyticsInsight[];
  topTransactions: AnalyticsTopTransaction[];
}
