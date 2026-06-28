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
  params: FetchAnalyticsParams,
): Promise<AnalyticsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', params.startDate);
  searchParams.set('endDate', params.endDate);

  if (params.granularity) {
    searchParams.set('granularity', params.granularity);
  }

  return apiGet<AnalyticsResponse>(`/analytics?${searchParams.toString()}`);
}
