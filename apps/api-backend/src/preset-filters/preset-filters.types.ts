export interface PresetFilterDateRange {
  startDate?: string;
  endDate?: string;
}

export interface PresetFilterDto {
  id: string;
  name: string;
  payee: string | null;
  dateRange: PresetFilterDateRange | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePresetFilterBody {
  name: string;
  payee?: string | null;
  dateRange?: PresetFilterDateRange | null;
  type?: string | null;
}

export interface UpdatePresetFilterBody {
  name?: string;
  payee?: string | null;
  dateRange?: PresetFilterDateRange | null;
  type?: string | null;
}
