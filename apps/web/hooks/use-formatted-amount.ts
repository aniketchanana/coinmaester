'use client';

import { formatTransactionAmount } from '../lib/currency';
import { useIncognito } from '../components/incognito-provider';

export function useFormattedAmount(value: number): string {
  const { isIncognito } = useIncognito();

  return formatTransactionAmount(value, { hidden: isIncognito });
}
