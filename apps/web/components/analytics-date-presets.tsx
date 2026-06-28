'use client';

import { endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/lib/utils';

import type { DateRangeValue } from './date-range-picker';

export const ANALYTICS_DATE_PRESET = {
  ONE_DAY: '1d',
  SEVEN_DAYS: '7d',
  THIRTY_DAYS: '30d',
  MONTH_TO_DATE: 'mtd',
  LAST_MONTH: 'last_month',
} as const;

export type AnalyticsDatePreset =
  (typeof ANALYTICS_DATE_PRESET)[keyof typeof ANALYTICS_DATE_PRESET];

const PRESET_OPTIONS: Array<{ id: AnalyticsDatePreset; label: string }> = [
  { id: ANALYTICS_DATE_PRESET.ONE_DAY, label: '1d' },
  { id: ANALYTICS_DATE_PRESET.SEVEN_DAYS, label: '7d' },
  { id: ANALYTICS_DATE_PRESET.THIRTY_DAYS, label: '30d' },
  { id: ANALYTICS_DATE_PRESET.MONTH_TO_DATE, label: 'MTD' },
  { id: ANALYTICS_DATE_PRESET.LAST_MONTH, label: 'Last month' },
];

function formatDateValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getDefaultAnalyticsDateRange(): DateRangeValue {
  return getAnalyticsDateRangeForPreset(ANALYTICS_DATE_PRESET.MONTH_TO_DATE);
}

export function getAnalyticsDateRangeForPreset(
  preset: AnalyticsDatePreset,
): DateRangeValue {
  const today = new Date();

  switch (preset) {
    case ANALYTICS_DATE_PRESET.ONE_DAY:
      return {
        startDate: formatDateValue(today),
        endDate: formatDateValue(today),
      };
    case ANALYTICS_DATE_PRESET.SEVEN_DAYS:
      return {
        startDate: formatDateValue(subDays(today, 6)),
        endDate: formatDateValue(today),
      };
    case ANALYTICS_DATE_PRESET.THIRTY_DAYS:
      return {
        startDate: formatDateValue(subDays(today, 29)),
        endDate: formatDateValue(today),
      };
    case ANALYTICS_DATE_PRESET.MONTH_TO_DATE:
      return {
        startDate: formatDateValue(startOfMonth(today)),
        endDate: formatDateValue(today),
      };
    case ANALYTICS_DATE_PRESET.LAST_MONTH: {
      const lastMonth = subMonths(today, 1);
      return {
        startDate: formatDateValue(startOfMonth(lastMonth)),
        endDate: formatDateValue(endOfMonth(lastMonth)),
      };
    }
    default:
      return getDefaultAnalyticsDateRange();
  }
}

interface AnalyticsDatePresetsProps {
  activePreset: AnalyticsDatePreset | null;
  onPresetChange: (preset: AnalyticsDatePreset, range: DateRangeValue) => void;
}

export function AnalyticsDatePresets({
  activePreset,
  onPresetChange,
}: AnalyticsDatePresetsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {PRESET_OPTIONS.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2.5 text-xs',
            activePreset === preset.id && 'bg-muted text-foreground',
          )}
          onClick={() =>
            onPresetChange(preset.id, getAnalyticsDateRangeForPreset(preset.id))
          }
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
