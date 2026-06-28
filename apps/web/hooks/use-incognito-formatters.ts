'use client';

import * as React from 'react';

import { useIncognito } from '../components/incognito-provider';
import { formatTransactionAmount } from '../lib/currency';
import { maskSensitiveText } from '../lib/incognito';

export function useIncognitoFormatters() {
  const { isIncognito } = useIncognito();

  const formatAmount = React.useCallback(
    (value: number) => formatTransactionAmount(value, { hidden: isIncognito }),
    [isIncognito],
  );

  const formatText = React.useCallback(
    (value: string) => maskSensitiveText(value, isIncognito),
    [isIncognito],
  );

  const formatCount = React.useCallback(
    (value: number) => (isIncognito ? '••' : String(value)),
    [isIncognito],
  );

  return {
    isIncognito,
    formatAmount,
    formatText,
    formatCount,
  };
}
