import { apiDelete, apiGet, apiPatch, apiPost } from './api-client';

export interface PresetFilterDateRange {
  startDate?: string;
  endDate?: string;
}

export interface PresetFilter {
  id: string;
  name: string;
  payee: string | null;
  dateRange: PresetFilterDateRange | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePresetFilterPayload {
  name: string;
  payee?: string | null;
  dateRange?: PresetFilterDateRange | null;
  type?: string | null;
}

export interface UpdatePresetFilterPayload {
  name?: string;
  payee?: string | null;
  dateRange?: PresetFilterDateRange | null;
  type?: string | null;
}

export const presetFilterKeys = {
  all: ['preset-filters'] as const,
  list: () => ['preset-filters', 'list'] as const,
};

export function fetchPresetFilters(): Promise<PresetFilter[]> {
  return apiGet<PresetFilter[]>('/preset-filters');
}

export async function createPresetFilter(
  payload: CreatePresetFilterPayload,
): Promise<PresetFilter> {
  const response = await apiPost<PresetFilter>('/preset-filters', payload);
  return response.data;
}

export function updatePresetFilter(
  id: string,
  payload: UpdatePresetFilterPayload,
): Promise<PresetFilter> {
  return apiPatch<PresetFilter>(`/preset-filters/${id}`, payload);
}

export function deletePresetFilter(id: string): Promise<void> {
  return apiDelete(`/preset-filters/${id}`);
}

export function filtersToPresetPayload(filters: {
  payee: string;
  type: string;
  startDate: string;
  endDate: string;
}): Pick<CreatePresetFilterPayload, 'payee' | 'type' | 'dateRange'> {
  const dateRange: PresetFilterDateRange = {};
  if (filters.startDate) {
    dateRange.startDate = filters.startDate;
  }
  if (filters.endDate) {
    dateRange.endDate = filters.endDate;
  }

  return {
    payee: filters.payee.trim() || null,
    type: filters.type || null,
    dateRange: Object.keys(dateRange).length > 0 ? dateRange : null,
  };
}

export function presetToFilters(preset: PresetFilter): {
  payee: string;
  type: string;
  startDate: string;
  endDate: string;
} {
  return {
    payee: preset.payee ?? '',
    type: preset.type ?? '',
    startDate: preset.dateRange?.startDate ?? '',
    endDate: preset.dateRange?.endDate ?? '',
  };
}
