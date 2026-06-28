'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { Label } from '@repo/ui/label';

import { useDebouncedValue } from '../hooks/use-debounced-value';
import { analyticsKeys, fetchAnalytics } from '../lib/analytics';
import {
  persistAnalyticsDatePreference,
  readStoredAnalyticsDatePreference,
} from '../lib/analytics-date-range';
import {
  AnalyticsDatePresets,
  type AnalyticsDatePreset,
} from './analytics-date-presets';
import {
  AnalyticsInsights,
  AnalyticsInsightsSkeleton,
} from './analytics-insights';
import {
  AnalyticsSummaryCards,
  AnalyticsSummaryCardsSkeleton,
} from './analytics-summary-cards';
import {
  AnalyticsTopPayees,
  AnalyticsTopPayeesSkeleton,
} from './analytics-top-payees';
import { DateRangePicker, type DateRangeValue } from './date-range-picker';

const FILTER_DEBOUNCE_MS = 400;

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(() => {
    return readStoredAnalyticsDatePreference().dateRange;
  });
  const [activePreset, setActivePreset] =
    React.useState<AnalyticsDatePreset | null>(() => {
      return readStoredAnalyticsDatePreference().preset;
    });

  const debouncedRange = useDebouncedValue(dateRange, FILTER_DEBOUNCE_MS);

  const queryParams = React.useMemo(
    () => ({
      startDate: debouncedRange.startDate,
      endDate: debouncedRange.endDate,
    }),
    [debouncedRange.endDate, debouncedRange.startDate],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: analyticsKeys.overview(queryParams),
    queryFn: () => fetchAnalytics(queryParams),
    staleTime: 60_000,
    enabled: Boolean(debouncedRange.startDate && debouncedRange.endDate),
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load analytics',
      );
    }
  }, [error, isError]);

  const handleDateRangeChange = (nextRange: DateRangeValue) => {
    setDateRange(nextRange);
    setActivePreset(null);
    persistAnalyticsDatePreference({ dateRange: nextRange, preset: null });
  };

  const handlePresetChange = (
    preset: AnalyticsDatePreset,
    nextRange: DateRangeValue,
  ) => {
    setActivePreset(preset);
    setDateRange(nextRange);
    persistAnalyticsDatePreference({ dateRange: nextRange, preset });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="analytics-date-range" className="text-sm font-medium">
          Date range
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DateRangePicker
            id="analytics-date-range"
            value={dateRange}
            onChange={handleDateRangeChange}
            className="w-full sm:w-[280px]"
          />
          <AnalyticsDatePresets
            activePreset={activePreset}
            onPresetChange={handlePresetChange}
          />
        </div>
      </div>

      {isLoading ? (
        <>
          <AnalyticsSummaryCardsSkeleton />
          <AnalyticsInsightsSkeleton />
          <AnalyticsTopPayeesSkeleton />
        </>
      ) : data ? (
        <>
          <AnalyticsSummaryCards summary={data.summary} />
          <AnalyticsInsights insights={data.insights} />
          <AnalyticsTopPayees byPayee={data.breakdown.byPayee} />
        </>
      ) : (
        <div className="rounded-lg border border-surface bg-card p-8 text-center text-sm text-muted-foreground">
          Select a date range to view analytics.
        </div>
      )}
    </div>
  );
}
