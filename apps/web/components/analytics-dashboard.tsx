'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as React from 'react';

import { Button } from '@repo/ui/button';

import { analyticsKeys, fetchAnalytics } from '../lib/analytics';
import { presetColorAt } from '../lib/analytics-chart-colors';
import {
  persistSelectedPresetIds,
  presetToAnalyticsParams,
  readStoredSelectedPresetIds,
} from '../lib/analytics-presets';
import {
  fetchPresetFilters,
  presetFilterKeys,
  type PresetFilter,
} from '../lib/preset-filters';
import { ANALYTICS_GRANULARITY } from '../types/analytics';
import { AnalyticsBreakdownPie } from './analytics-breakdown-pie';
import type { ComparePresetSeries } from './analytics-compare-bars';
import { AnalyticsCompareBars } from './analytics-compare-bars';
import { AnalyticsCompareMetrics } from './analytics-compare-metrics';
import { AnalyticsDailySpendChart } from './analytics-daily-spend-chart';
import { AnalyticsKpis, AnalyticsKpisSkeleton } from './analytics-kpis';
import { AnalyticsPresetBar } from './analytics-preset-bar';
import { AnalyticsTopTransactions } from './analytics-top-transactions';
import { PresetFilterCreateDialog } from './preset-filter-create-dialog';

function getLatestPresetId(presets: PresetFilter[]): string | null {
  if (presets.length === 0) {
    return null;
  }

  // API returns presets ordered by createdAt desc; still pick max by date.
  const latest = presets.reduce((best, preset) =>
    new Date(preset.createdAt).getTime() > new Date(best.createdAt).getTime()
      ? preset
      : best,
  );

  return latest.id;
}

function AnalyticsEmptyPresets({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-surface px-6 py-16 text-center">
      <p className="text-base font-medium">No presets yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Please create a preset filter to view analytics. Presets let you scope
        charts and comparisons to a date range, payee, or type.
      </p>
      <Button className="mt-2 gap-1.5" onClick={onCreateClick}>
        <Plus className="size-3.5" />
        Create preset
      </Button>
    </div>
  );
}

function AnalyticsSingleView({ preset }: { preset: PresetFilter }) {
  const params = presetToAnalyticsParams(preset);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: analyticsKeys.overview(params),
    queryFn: () => fetchAnalytics(params),
    staleTime: 60_000,
  });

  const granularityLabel =
    params.granularity === ANALYTICS_GRANULARITY.MONTH
      ? 'Month by month'
      : 'Day by day';

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="h-56 animate-pulse rounded-lg border border-surface bg-muted/40 sm:h-64 md:h-80" />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-lg border border-surface bg-muted/40 sm:h-64 md:h-80" />
          <div className="h-56 animate-pulse rounded-lg border border-surface bg-muted/40 sm:h-64 md:h-80" />
        </div>
        <AnalyticsKpisSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {(error as Error)?.message || 'Failed to load analytics.'}
      </p>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <AnalyticsDailySpendChart
        trends={data.trends ?? []}
        granularityLabel={granularityLabel}
      />
      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="min-w-0 max-md:hidden">
          <AnalyticsBreakdownPie summary={data.summary} />
        </div>
        <AnalyticsTopTransactions
          startDate={params.startDate}
          endDate={params.endDate}
          payee={params.payee}
        />
      </div>
      <AnalyticsKpis summary={data.summary} />
    </div>
  );
}

function AnalyticsCompareView({
  presets,
  colorById,
}: {
  presets: PresetFilter[];
  colorById: Map<string, string>;
}) {
  const queries = useQueries({
    queries: presets.map((preset) => {
      const params = presetToAnalyticsParams(preset);
      return {
        queryKey: analyticsKeys.overview(params),
        queryFn: () => fetchAnalytics(params),
        staleTime: 60_000,
      };
    }),
  });

  const isLoading = queries.some((query) => query.isLoading);
  const firstError = queries.find((query) => query.isError)?.error;

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <AnalyticsKpisSkeleton />
        <div className="h-56 animate-pulse rounded-lg border border-surface bg-muted/40 sm:h-64 md:h-80" />
      </div>
    );
  }

  if (firstError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {(firstError as Error)?.message || 'Failed to load comparison.'}
      </p>
    );
  }

  const series: ComparePresetSeries[] = presets.flatMap((preset, index) => {
    const data = queries[index]?.data;
    if (!data) {
      return [];
    }

    const params = presetToAnalyticsParams(preset);

    return [
      {
        id: preset.id,
        name: preset.name,
        color: colorById.get(preset.id) ?? presetColorAt(index),
        summary: data.summary,
        startDate:
          params.startDate ?? data.trends?.[0]?.date?.slice(0, 10) ?? null,
        endDate:
          params.endDate ??
          data.trends?.[data.trends.length - 1]?.date?.slice(0, 10) ??
          null,
      },
    ];
  });

  if (series.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No data available for the selected presets.
      </p>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <AnalyticsCompareMetrics series={series} />
      <AnalyticsCompareBars series={series} />
    </div>
  );
}

export function AnalyticsDashboard() {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    setSelectedIds(readStoredSelectedPresetIds());
    setHydrated(true);
  }, []);

  const { data: presets = [], isLoading: presetsLoading } = useQuery({
    queryKey: presetFilterKeys.list(),
    queryFn: fetchPresetFilters,
  });

  React.useEffect(() => {
    if (!hydrated || presetsLoading) {
      return;
    }

    if (presets.length === 0) {
      if (selectedIds.length > 0) {
        setSelectedIds([]);
        persistSelectedPresetIds([]);
      }
      return;
    }

    const validIds = new Set(presets.map((preset) => preset.id));
    const validSelected = selectedIds.filter((id) => validIds.has(id));
    const latestId = getLatestPresetId(presets);

    if (validSelected.length === 0 && latestId) {
      setSelectedIds([latestId]);
      persistSelectedPresetIds([latestId]);
      return;
    }

    if (validSelected.length !== selectedIds.length) {
      setSelectedIds(validSelected);
      persistSelectedPresetIds(validSelected);
    }
  }, [hydrated, presets, presetsLoading, selectedIds]);

  const handleSelectedIdsChange = (ids: string[]) => {
    if (ids.length === 0) {
      const latestId = getLatestPresetId(presets);
      if (latestId) {
        setSelectedIds([latestId]);
        persistSelectedPresetIds([latestId]);
        return;
      }
    }

    setSelectedIds(ids);
    persistSelectedPresetIds(ids);
  };

  const colorById = React.useMemo(() => {
    const map = new Map<string, string>();
    presets.forEach((preset, index) => {
      map.set(preset.id, presetColorAt(index));
    });
    return map;
  }, [presets]);

  const selectedPresets = presets.filter((preset) =>
    selectedIds.includes(preset.id),
  );
  const isCompare = selectedPresets.length >= 2;
  const singlePreset =
    selectedPresets.length === 1 ? (selectedPresets[0] ?? null) : null;
  const hasNoPresets = !presetsLoading && presets.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <AnalyticsPresetBar
        presets={presets}
        selectedIds={selectedIds}
        onSelectedIdsChange={handleSelectedIdsChange}
        onCreateClick={() => setCreateOpen(true)}
      />

      <div className="border-t pt-3 sm:pt-4">
        {hasNoPresets ? (
          <AnalyticsEmptyPresets onCreateClick={() => setCreateOpen(true)} />
        ) : (
          <>
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base font-semibold tracking-tight">
                {isCompare ? 'Compare' : 'Overview'}
              </h2>
              <p className="hidden text-sm text-muted-foreground sm:block">
                {isCompare
                  ? `Comparing ${selectedPresets.length} presets side by side.`
                  : singlePreset
                    ? `Scoped to “${singlePreset.name}”.`
                    : 'Loading preset…'}
              </p>
            </div>

            {presetsLoading || selectedPresets.length === 0 ? (
              <AnalyticsKpisSkeleton />
            ) : isCompare ? (
              <AnalyticsCompareView
                presets={selectedPresets}
                colorById={colorById}
              />
            ) : singlePreset ? (
              <AnalyticsSingleView preset={singlePreset} />
            ) : null}
          </>
        )}
      </div>

      <PresetFilterCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(presetId) => {
          handleSelectedIdsChange([presetId]);
        }}
      />
    </div>
  );
}
