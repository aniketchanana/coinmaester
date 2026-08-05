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
          className="hidden shrink-0 rounded-sm text-muted-foreground/70 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
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
      key: 'debit' as const,
      label: 'Debit',
      className: 'text-amber-600 dark:text-amber-500',
      content: <FormattedAmount value={aggregate.totalDebit} />,
      /** Always show — primary mobile metric */
      priority: 'primary' as const,
    },
    {
      key: 'spent-today' as const,
      label: 'Today',
      className: 'text-rose-600 dark:text-rose-400',
      content: <FormattedAmount value={spentToday} />,
      priority: 'primary' as const,
    },
    {
      key: 'credit' as const,
      label: 'Credit',
      className: 'text-emerald-600 dark:text-emerald-500',
      content: <FormattedAmount value={aggregate.totalCredit} />,
      priority: 'secondary' as const,
    },
    {
      key: 'investment' as const,
      label: 'Investment',
      className: 'text-violet-600 dark:text-violet-400',
      content: <FormattedAmount value={aggregate.totalInvestment} />,
      priority: 'secondary' as const,
    },
    {
      key: 'invest-percentage' as const,
      label: 'Invest %',
      className: 'text-violet-600 dark:text-violet-400',
      content: <>{Math.round(investPercentage(aggregate))}%</>,
      priority: 'secondary' as const,
    },
    ...(hasDateRangeFilter
      ? [
          {
            key: 'avg-daily' as const,
            label: 'Avg / day',
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
            priority: 'secondary' as const,
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3',
        hasDateRangeFilter ? 'xl:grid-cols-6' : 'xl:grid-cols-5',
      )}
    >
      {cards.map((card, index) => (
        <div
          key={card.key}
          className={cn(
            'rounded-lg border border-surface bg-card p-2.5 shadow-surface-sm backdrop-blur-surface sm:p-3',
            REVEAL_UP_CLASS,
            card.priority === 'secondary' && 'hidden md:block',
          )}
          style={staggerDelay(index)}
        >
          <div className="flex items-center gap-1">
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {card.label}
            </p>
            <MetricInfoIcon description={METRIC_INFO[card.key]} />
          </div>
          <p
            className={cn(
              'mt-0.5 text-base font-semibold tracking-tight sm:text-lg md:text-xl',
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

const MOBILE_SKELETON_KEYS = ['debit', 'spent-today'] as const;
const DESKTOP_EXTRA_KEYS = [
  'credit',
  'investment',
  'invest-percentage',
] as const;

interface TransactionsSummaryCardsSkeletonProps {
  /** When true, reserve a slot for Daily Average Spent. */
  showAvgDaily?: boolean;
}

export function TransactionsSummaryCardsSkeleton({
  showAvgDaily = false,
}: TransactionsSummaryCardsSkeletonProps) {
  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3',
        showAvgDaily ? 'xl:grid-cols-6' : 'xl:grid-cols-5',
      )}
    >
      {MOBILE_SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="rounded-lg border border-surface bg-card p-2.5 shadow-surface-sm sm:p-3"
        >
          <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-5 w-20 animate-pulse rounded bg-muted sm:h-6 sm:w-24" />
        </div>
      ))}
      {DESKTOP_EXTRA_KEYS.map((key) => (
        <div
          key={key}
          className="hidden rounded-lg border border-surface bg-card p-2.5 shadow-surface-sm md:block sm:p-3"
        >
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
      {showAvgDaily ? (
        <div className="hidden rounded-lg border border-surface bg-card p-2.5 shadow-surface-sm md:block sm:p-3">
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      ) : null}
    </div>
  );
}
