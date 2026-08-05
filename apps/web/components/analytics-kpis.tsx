'use client';

import { cn } from '@repo/ui/lib/utils';

import { REVEAL_UP_CLASS, staggerDelay } from '../lib/motion';
import type { AnalyticsSummary } from '../types/analytics';
import { FormattedAmount } from './formatted-amount';

interface AnalyticsKpisProps {
  summary: AnalyticsSummary;
}

function percentLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  return `${value.toFixed(1)}%`;
}

export function AnalyticsKpis({ summary }: AnalyticsKpisProps) {
  const creditToInvestment =
    summary.totalCredit > 0
      ? (summary.totalInvestment / summary.totalCredit) * 100
      : null;
  const avgDailySpend = summary.avgDailySpend;

  const cards = [
    {
      key: 'debit',
      label: 'Spend',
      content: <FormattedAmount value={summary.totalDebit} />,
      className: 'text-rose-600 dark:text-rose-400',
      priority: 'primary' as const,
    },
    {
      key: 'credit',
      label: 'Income',
      content: <FormattedAmount value={summary.totalCredit} />,
      className: 'text-emerald-600 dark:text-emerald-400',
      priority: 'primary' as const,
    },
    {
      key: 'investment',
      label: 'Investments',
      content: <FormattedAmount value={summary.totalInvestment} />,
      className: 'text-violet-600 dark:text-violet-400',
      priority: 'secondary' as const,
    },
    {
      key: 'credit-to-investment',
      label: 'Credit → Invest %',
      content: percentLabel(creditToInvestment),
      className: 'text-violet-600 dark:text-violet-400',
      priority: 'secondary' as const,
    },
    ...(avgDailySpend
      ? [
          {
            key: 'avg',
            label: 'Avg Daily',
            content: <FormattedAmount value={avgDailySpend} />,
            className: 'text-foreground',
            priority: 'secondary' as const,
          },
        ]
      : []),
    {
      key: 'count',
      label: 'Txns',
      content: String(summary.transactionCount),
      className: 'text-foreground',
      priority: 'secondary' as const,
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={card.key}
          className={cn(
            'min-w-0 rounded-lg border border-surface bg-card p-2.5 shadow-surface-sm backdrop-blur-surface sm:p-3',
            REVEAL_UP_CLASS,
            card.priority === 'secondary' && 'hidden md:block',
          )}
          style={staggerDelay(index)}
        >
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            {card.label}
          </p>
          <p
            className={cn(
              'mt-0.5 truncate text-sm font-semibold tracking-tight tabular-nums sm:text-lg md:text-xl',
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

export function AnalyticsKpisSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={`primary-${index}`}
          className="h-14 animate-pulse rounded-lg border border-surface bg-muted/40"
        />
      ))}
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`secondary-${index}`}
          className="hidden h-16 animate-pulse rounded-lg border border-surface bg-muted/40 md:block"
        />
      ))}
    </div>
  );
}
