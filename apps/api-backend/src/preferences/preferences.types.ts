import type { CurrencyType } from '@repo/constant';

export interface PreferencesDto {
  currencyType: CurrencyType;
}

export interface UpdatePreferencesBody {
  currencyType: CurrencyType;
}
