'use client';

import { formatTransactionAmount } from '../lib/currency';
import { useCurrency } from '../components/currency-provider';
import { useIncognito } from '../components/incognito-provider';

export function useFormattedAmount(value: number): string {
  const { isIncognito } = useIncognito();
  const { currency } = useCurrency();

  return formatTransactionAmount(value, {
    hidden: isIncognito,
    currency,
  });
}
