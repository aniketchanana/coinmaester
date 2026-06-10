'use client';

import { useFormattedAmount } from '../hooks/use-formatted-amount';

interface FormattedAmountProps {
  value: number;
}

export function FormattedAmount({ value }: FormattedAmountProps) {
  const formatted = useFormattedAmount(value);

  return <>{formatted}</>;
}
