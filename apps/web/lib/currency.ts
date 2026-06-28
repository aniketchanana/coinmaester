import { TRANSACTION_CURRENCY, TRANSACTION_LOCALE } from '@repo/constant';

const amountFormatter = new Intl.NumberFormat(TRANSACTION_LOCALE, {
  style: 'currency',
  currency: TRANSACTION_CURRENCY,
});

export const MASKED_TRANSACTION_AMOUNT = '₹ ••••••';

interface FormatTransactionAmountOptions {
  hidden?: boolean;
}

export function formatTransactionAmount(
  value: number,
  options?: FormatTransactionAmountOptions,
): string {
  if (options?.hidden) {
    return MASKED_TRANSACTION_AMOUNT;
  }

  return amountFormatter.format(value);
}
