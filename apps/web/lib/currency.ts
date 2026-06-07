import { TRANSACTION_CURRENCY, TRANSACTION_LOCALE } from '@repo/constant';

const amountFormatter = new Intl.NumberFormat(TRANSACTION_LOCALE, {
  style: 'currency',
  currency: TRANSACTION_CURRENCY,
});

export function formatTransactionAmount(value: number): string {
  return amountFormatter.format(value);
}
