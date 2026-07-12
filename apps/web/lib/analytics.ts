import type {
  AnalyticsResponse,
  FetchAnalyticsParams,
} from '../types/analytics';
import { apiGet } from './api-client';

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (params: FetchAnalyticsParams) =>
    ['analytics', 'overview', params] as const,
};

export function fetchAnalytics(
  params: FetchAnalyticsParams = {},
): Promise<AnalyticsResponse> {
  const searchParams = new URLSearchParams();

  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }

  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }

  if (params.payee) {
    searchParams.set('payee', params.payee);
  }

  if (params.type) {
    searchParams.set('type', params.type);
  }

  if (params.granularity) {
    searchParams.set('granularity', params.granularity);
  }

  const query = searchParams.toString();

  return apiGet<AnalyticsResponse>(
    query ? `/analytics?${query}` : '/analytics',
  ).then((data) => ({
    ...data,
    trends: data.trends ?? [],
    topTransactions: data.topTransactions ?? [],
    insights: data.insights ?? [],
    breakdown: {
      byPayee: data.breakdown?.byPayee ?? [],
      byBank: data.breakdown?.byBank ?? [],
    },
  }));
}
