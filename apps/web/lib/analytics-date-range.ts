import {
  ANALYTICS_DATE_PRESET,
  getAnalyticsDateRangeForPreset,
  type AnalyticsDatePreset,
} from '../components/analytics-date-presets';
import type { DateRangeValue } from '../components/date-range-picker';

export const ANALYTICS_DATE_RANGE_STORAGE_KEY =
  'finance-app:analytics-date-range';

interface StoredAnalyticsDatePreference {
  preset: AnalyticsDatePreset | null;
  startDate: string;
  endDate: string;
}

export interface AnalyticsDatePreference {
  dateRange: DateRangeValue;
  preset: AnalyticsDatePreset | null;
}

function getDefaultPreference(): AnalyticsDatePreference {
  return {
    preset: ANALYTICS_DATE_PRESET.MONTH_TO_DATE,
    dateRange: getAnalyticsDateRangeForPreset(
      ANALYTICS_DATE_PRESET.MONTH_TO_DATE,
    ),
  };
}

function isAnalyticsDatePreset(value: string): value is AnalyticsDatePreset {
  return Object.values(ANALYTICS_DATE_PRESET).includes(
    value as AnalyticsDatePreset,
  );
}

export function readStoredAnalyticsDatePreference(): AnalyticsDatePreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference();
  }

  try {
    const raw = localStorage.getItem(ANALYTICS_DATE_RANGE_STORAGE_KEY);
    if (!raw) {
      return getDefaultPreference();
    }

    const parsed = JSON.parse(raw) as Partial<StoredAnalyticsDatePreference>;

    if (parsed.preset && isAnalyticsDatePreset(parsed.preset)) {
      return {
        preset: parsed.preset,
        dateRange: getAnalyticsDateRangeForPreset(parsed.preset),
      };
    }

    if (parsed.startDate && parsed.endDate) {
      return {
        preset: null,
        dateRange: {
          startDate: parsed.startDate,
          endDate: parsed.endDate,
        },
      };
    }
  } catch {
    // Ignore invalid stored preferences.
  }

  return getDefaultPreference();
}

export function persistAnalyticsDatePreference(
  preference: AnalyticsDatePreference,
): void {
  try {
    const stored: StoredAnalyticsDatePreference = {
      preset: preference.preset,
      startDate: preference.dateRange.startDate,
      endDate: preference.dateRange.endDate,
    };
    localStorage.setItem(
      ANALYTICS_DATE_RANGE_STORAGE_KEY,
      JSON.stringify(stored),
    );
  } catch {
    // Ignore storage failures.
  }
}
