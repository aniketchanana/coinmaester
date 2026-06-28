'use client';

import { maskSensitiveText } from '../lib/incognito';
import { useIncognito } from './incognito-provider';

interface MaskedSensitiveTextProps {
  value: string;
}

export function MaskedSensitiveText({ value }: MaskedSensitiveTextProps) {
  const { isIncognito } = useIncognito();

  return <>{maskSensitiveText(value, isIncognito)}</>;
}
