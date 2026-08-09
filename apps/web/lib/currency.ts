import {
  DEFAULT_CURRENCY,
  TRANSACTION_LOCALE,
  type CurrencyType,
} from '@repo/constant';

const numberFormatter = new Intl.NumberFormat(TRANSACTION_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface FormatTransactionAmountOptions {
  hidden?: boolean;
  currency?: CurrencyType;
}

export function formatTransactionAmount(
  value: number,
  options?: FormatTransactionAmountOptions,
): string {
  const currency = options?.currency ?? DEFAULT_CURRENCY;

  if (options?.hidden) {
    return `${currency.symbol} ••••••`;
  }

  return `${currency.symbol}${numberFormatter.format(value)}`;
}
