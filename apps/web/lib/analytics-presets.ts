import type { PresetFilter } from './preset-filters';
import { presetToFilters } from './preset-filters';
import type { FetchAnalyticsParams } from '../types/analytics';
import { ANALYTICS_GRANULARITY } from '../types/analytics';

const STORAGE_KEY = 'finance-app:analytics-selected-presets';

export function presetToAnalyticsParams(
  preset: PresetFilter | null,
): FetchAnalyticsParams {
  if (!preset) {
    return {
      granularity: ANALYTICS_GRANULARITY.MONTH,
    };
  }

  const filters = presetToFilters(preset);
  const hasDateRange = Boolean(filters.startDate || filters.endDate);

  return {
    payee: filters.payee || undefined,
    type: filters.type || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    granularity: hasDateRange
      ? ANALYTICS_GRANULARITY.DAY
      : ANALYTICS_GRANULARITY.MONTH,
  };
}

export function readStoredSelectedPresetIds(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

export function persistSelectedPresetIds(ids: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
