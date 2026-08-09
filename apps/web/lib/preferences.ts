import type { CurrencyType } from '@repo/constant';

import { apiGet, apiClient } from './api-client';

export interface PreferencesResponse {
  currencyType: CurrencyType;
}

export const preferenceKeys = {
  all: ['preferences'] as const,
  detail: () => ['preferences', 'detail'] as const,
};

export function fetchPreferences(): Promise<PreferencesResponse> {
  return apiGet<PreferencesResponse>('/preferences');
}

export async function updatePreferences(
  currencyType: CurrencyType,
): Promise<PreferencesResponse> {
  const response = await apiClient.put<PreferencesResponse>('/preferences', {
    currencyType,
  });
  return response.data;
}
