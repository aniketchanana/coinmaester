'use client';

import * as React from 'react';

import { Input } from '@repo/ui/input';
import { cn } from '@repo/ui/lib/utils';

import { useIncognito } from './incognito-provider';

export function SensitiveTextInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const { isIncognito } = useIncognito();

  return (
    <Input
      {...props}
      className={cn(isIncognito && 'incognito-mask-input', className)}
      autoComplete="off"
    />
  );
}
