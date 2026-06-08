import { TRANSACTION_TYPE, type TransactionType } from '@repo/constant';

import { Badge } from '@repo/ui/badge';
import { cn } from '@repo/ui/lib/utils';

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

interface TransactionTypeBadgeProps {
  type: TransactionType;
  className?: string;
}

export function TransactionTypeBadge({
  type,
  className,
}: TransactionTypeBadgeProps) {
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
