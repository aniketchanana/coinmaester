'use client';

import { Info } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip';

import { computeAvgDailySpend } from '../lib/analytics-avg-daily-spend';
import { REVEAL_UP_CLASS, staggerDelay } from '../lib/motion';
import type { TransactionsAggregate } from '../types/transaction';
import { FormattedAmount } from './formatted-amount';

interface TransactionsSummaryCardsProps {
  aggregate: TransactionsAggregate;
  /** Filter start (yyyy-MM-dd). When set with a date filter, shows Daily Average Spent. */
  startDate?: string | null;
  /** Filter end (yyyy-MM-dd). Avg daily = totalDebit / max(1, endDate − startDate). */
  endDate?: string | null;
  /** Total non-investment debit for the user's local today. */
  spentToday: number;
}

const METRIC_INFO = {
  credit: 'All incoming amounts to your bank for the current filter or view.',
  debit: 'All outgoing amounts from your bank for the current filter or view.',
  investment:
    'Outgoing amounts classified as investments for the current filter or view.',
  'invest-percentage':
    'Investment outgoings divided by total credit for the current filter or view.',
  'avg-daily':
    'Total debit divided by the number of days in the selected date range (inclusive of start and end).',
  'spent-today': 'How much you have spent today (debit only).',
} as const;

function investPercentage(aggregate: TransactionsAggregate): number {
  if (aggregate.totalCredit <= 0) {
    return 0;
  }
  return (aggregate.totalInvestment / aggregate.totalCredit) * 100;
}

function MetricInfoIcon({ description }: { description: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-sm text-muted-foreground/70 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="How this metric is calculated"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

export function TransactionsSummaryCards({
  aggregate,
  startDate,
  endDate,
  spentToday,
}: TransactionsSummaryCardsProps) {
  const hasDateRangeFilter = Boolean(startDate?.trim() && endDate?.trim());

  const cards = [
    {
      key: 'credit' as const,
      label: 'Credit',
      className: 'text-emerald-600 dark:text-emerald-500',
      content: <FormattedAmount value={aggregate.totalCredit} />,
    },
    {
      key: 'debit' as const,
      label: 'Debit',
      className: 'text-amber-600 dark:text-amber-500',
      content: <FormattedAmount value={aggregate.totalDebit} />,
    },
    {
      key: 'investment' as const,
      label: 'Investment',
      className: 'text-violet-600 dark:text-violet-400',
      content: <FormattedAmount value={aggregate.totalInvestment} />,
    },
    {
      key: 'invest-percentage' as const,
      label: 'Invest Percentage',
      className: 'text-violet-600 dark:text-violet-400',
      content: <>{Math.round(investPercentage(aggregate))}%</>,
    },
    ...(hasDateRangeFilter
      ? [
          {
            key: 'avg-daily' as const,
            label: 'Daily Average Spent',
            className: 'text-sky-600 dark:text-sky-400',
            content: (
              <FormattedAmount
                value={
                  computeAvgDailySpend(
                    aggregate.totalDebit,
                    startDate,
                    endDate,
                  ) as number
                }
              />
            ),
          },
        ]
      : []),
    {
      key: 'spent-today' as const,
      label: 'Spent Today',
      className: 'text-rose-600 dark:text-rose-400',
      content: <FormattedAmount value={spentToday} />,
    },
  ];

  return (
    <div
      className={cn(
        'grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3',
        hasDateRangeFilter ? 'xl:grid-cols-6' : 'xl:grid-cols-5',
      )}
    >
      {cards.map((card, index) => (
        <div
          key={card.key}
          className={cn(
            'rounded-lg border border-surface bg-card p-4 shadow-surface-sm backdrop-blur-surface',
            REVEAL_UP_CLASS,
          )}
          style={staggerDelay(index)}
        >
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <MetricInfoIcon description={METRIC_INFO[card.key]} />
          </div>
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

const BASE_SKELETON_KEYS = [
  'credit',
  'debit',
  'investment',
  'invest-percentage',
  'spent-today',
] as const;

interface TransactionsSummaryCardsSkeletonProps {
  /** When true, reserve a slot for Daily Average Spent. */
  showAvgDaily?: boolean;
}

export function TransactionsSummaryCardsSkeleton({
  showAvgDaily = false,
}: TransactionsSummaryCardsSkeletonProps) {
  const keys = showAvgDaily
    ? [
        ...BASE_SKELETON_KEYS.slice(0, 4),
        'avg-daily',
        ...BASE_SKELETON_KEYS.slice(4),
      ]
    : [...BASE_SKELETON_KEYS];

  return (
    <div
      className={cn(
        'grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3',
        showAvgDaily ? 'xl:grid-cols-6' : 'xl:grid-cols-5',
      )}
    >
      {keys.map((key) => (
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
