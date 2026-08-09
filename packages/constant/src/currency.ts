export const TRANSACTION_CURRENCY = 'INR' as const;
export const TRANSACTION_LOCALE = 'en-IN' as const;

export type CurrencyType = {
  name: string;
  symbol: string;
};

export const DEFAULT_CURRENCY: CurrencyType = {
  name: 'Indian Rupee',
  symbol: '₹',
};

/** Popular currencies available for user preference selection. */
export const CURRENCY_OPTIONS: readonly CurrencyType[] = [
  DEFAULT_CURRENCY,
  { name: 'US Dollar', symbol: '$' },
  { name: 'Euro', symbol: '€' },
  { name: 'British Pound', symbol: '£' },
  { name: 'Japanese Yen', symbol: '¥' },
  { name: 'Chinese Yuan', symbol: '¥' },
  { name: 'Australian Dollar', symbol: 'A$' },
  { name: 'Canadian Dollar', symbol: 'C$' },
  { name: 'Swiss Franc', symbol: 'CHF' },
  { name: 'Singapore Dollar', symbol: 'S$' },
  { name: 'Hong Kong Dollar', symbol: 'HK$' },
  { name: 'UAE Dirham', symbol: 'AED' },
  { name: 'Saudi Riyal', symbol: 'SAR' },
  { name: 'South African Rand', symbol: 'R' },
  { name: 'Brazilian Real', symbol: 'R$' },
  { name: 'Russian Ruble', symbol: '₽' },
  { name: 'South Korean Won', symbol: '₩' },
  { name: 'Mexican Peso', symbol: 'MX$' },
  { name: 'New Zealand Dollar', symbol: 'NZ$' },
  { name: 'Swedish Krona', symbol: 'kr' },
  { name: 'Norwegian Krone', symbol: 'kr' },
  { name: 'Turkish Lira', symbol: '₺' },
  { name: 'Thai Baht', symbol: '฿' },
  { name: 'Indonesian Rupiah', symbol: 'Rp' },
  { name: 'Philippine Peso', symbol: '₱' },
] as const;

export function isCurrencyType(value: unknown): value is CurrencyType {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.symbol === 'string' &&
    CURRENCY_OPTIONS.some(
      (option) =>
        option.name === candidate.name && option.symbol === candidate.symbol,
    )
  );
}
