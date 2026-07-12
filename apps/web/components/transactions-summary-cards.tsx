'use client';

import { cn } from '@repo/ui/lib/utils';

import { computeAvgDailySpend } from '../lib/analytics-avg-daily-spend';
import { REVEAL_UP_CLASS, staggerDelay } from '../lib/motion';
import type { TransactionsAggregate } from '../types/transaction';
import { FormattedAmount } from './formatted-amount';

interface TransactionsSummaryCardsProps {
  aggregate: TransactionsAggregate;
  /** Filter start (yyyy-MM-dd). Avg daily = totalDebit / (today − startDate). */
  startDate?: string | null;
  /** Total non-investment debit for the user's local today. */
  spentToday: number;
}

function investPercentage(aggregate: TransactionsAggregate): number {
  if (aggregate.totalCredit <= 0) {
    return 0;
  }
  return (aggregate.totalInvestment / aggregate.totalCredit) * 100;
}

export function TransactionsSummaryCards({
  aggregate,
  startDate,
  spentToday,
}: TransactionsSummaryCardsProps) {
  const avgDailySpend = computeAvgDailySpend(aggregate.totalDebit, startDate);

  const cards = [
    {
      key: 'credit',
      label: 'Credit',
      className: 'text-emerald-600 dark:text-emerald-500',
      content: <FormattedAmount value={aggregate.totalCredit} />,
    },
    {
      key: 'debit',
      label: 'Debit',
      className: 'text-amber-600 dark:text-amber-500',
      content: <FormattedAmount value={aggregate.totalDebit} />,
    },
    {
      key: 'investment',
      label: 'Investment',
      className: 'text-violet-600 dark:text-violet-400',
      content: <FormattedAmount value={aggregate.totalInvestment} />,
    },
    {
      key: 'invest-percentage',
      label: 'Invest Percentage',
      className: 'text-violet-600 dark:text-violet-400',
      content: <>{Math.round(investPercentage(aggregate))}%</>,
    },
    {
      key: 'avg-daily',
      label: 'Daily Average Spent',
      className: 'text-sky-600 dark:text-sky-400',
      content: <FormattedAmount value={avgDailySpend} />,
    },
    {
      key: 'spent-today',
      label: 'Spent Today',
      className: 'text-rose-600 dark:text-rose-400',
      content: <FormattedAmount value={spentToday} />,
    },
  ] as const;

  return (
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => (
        <div
          key={card.key}
          className={cn(
            'rounded-lg border border-surface bg-card p-4 shadow-surface-sm backdrop-blur-surface',
            REVEAL_UP_CLASS,
          )}
          style={staggerDelay(index)}
        >
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold tracking-tight',
              card.className,
            )}
          >
            {card.content}
          </p>
        </div>
      ))}
    </div>
  );
}

const SKELETON_KEYS = [
  'credit',
  'debit',
  'investment',
  'invest-percentage',
  'avg-daily',
  'spent-today',
] as const;

export function TransactionsSummaryCardsSkeleton() {
  return (
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="rounded-lg border border-surface bg-card p-4 shadow-surface-sm"
        >
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
