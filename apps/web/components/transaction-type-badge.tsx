'use client';

import { TRANSACTION_TYPE, type TransactionType } from '@repo/constant';

import { Badge } from '@repo/ui/badge';
import { cn } from '@repo/ui/lib/utils';

import { INCOGNITO_TRANSACTION_TYPE_LABEL } from '../lib/incognito';
import { useIncognito } from './incognito-provider';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TRANSACTION_TYPE.DEBIT]: 'Debit',
  [TRANSACTION_TYPE.CREDIT]: 'Credit',
};

const TRANSACTION_TYPE_BADGE_CLASS: Record<TransactionType, string> = {
  [TRANSACTION_TYPE.DEBIT]:
    'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  [TRANSACTION_TYPE.CREDIT]:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

const INVESTMENT_BADGE_CLASS =
  'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';

const INCOGNITO_TYPE_BADGE_CLASS =
  'border-muted-foreground/25 bg-muted/60 text-muted-foreground';

interface TransactionTypeBadgeProps {
  type: TransactionType;
  isInvestment?: boolean;
  className?: string;
}

export function TransactionTypeBadge({
  type,
  isInvestment = false,
  className,
}: TransactionTypeBadgeProps) {
  const { isIncognito } = useIncognito();

  if (isIncognito) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'whitespace-nowrap text-xs',
          INCOGNITO_TYPE_BADGE_CLASS,
          className,
        )}
      >
        {INCOGNITO_TRANSACTION_TYPE_LABEL}
      </Badge>
    );
  }

  if (isInvestment) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'whitespace-nowrap text-xs',
          INVESTMENT_BADGE_CLASS,
          className,
        )}
      >
        Investment
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'whitespace-nowrap text-xs',
        TRANSACTION_TYPE_BADGE_CLASS[type],
        className,
      )}
    >
      {TRANSACTION_TYPE_LABELS[type]}
    </Badge>
  );
}
