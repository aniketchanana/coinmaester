'use client';

import * as React from 'react';

import { Input } from '@repo/ui/input';
import { cn } from '@repo/ui/lib/utils';

import { useIncognito } from './incognito-provider';

interface SensitiveAmountInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  value: string;
}

export function SensitiveAmountInput({
  className,
  value,
  ...props
}: SensitiveAmountInputProps) {
  const { isIncognito } = useIncognito();

  return (
    <Input
      {...props}
      value={value}
      type={isIncognito ? 'text' : 'number'}
      inputMode={isIncognito ? undefined : 'decimal'}
      className={cn(isIncognito && 'incognito-mask-input', className)}
      autoComplete="off"
    />
  );
}
