'use client';

import { cn } from '@repo/ui/lib/utils';

import { computeAvgDailySpend } from '../lib/analytics-avg-daily-spend';
import { REVEAL_UP_CLASS, staggerDelay } from '../lib/motion';
import type { AnalyticsSummary } from '../types/analytics';
import { FormattedAmount } from './formatted-amount';

interface AnalyticsKpisProps {
  summary: AnalyticsSummary;
  /** Period start (yyyy-MM-dd). Avg daily spend = totalDebit / (today − startDate). */
  startDate?: string | null;
}

function percentLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  return `${value.toFixed(1)}%`;
}

export function AnalyticsKpis({ summary, startDate }: AnalyticsKpisProps) {
  const creditToInvestment =
    summary.totalCredit > 0
      ? (summary.totalInvestment / summary.totalCredit) * 100
      : null;
  const avgDailySpend = computeAvgDailySpend(summary.totalDebit, startDate);

  const cards = [
    {
      key: 'debit',
      label: 'Total Spend',
      content: <FormattedAmount value={summary.totalDebit} />,
      className: 'text-rose-600 dark:text-rose-400',
    },
    {
      key: 'credit',
      label: 'Total Income',
      content: <FormattedAmount value={summary.totalCredit} />,
      className: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'investment',
      label: 'Investments',
      content: <FormattedAmount value={summary.totalInvestment} />,
      className: 'text-violet-600 dark:text-violet-400',
    },
    {
      key: 'credit-to-investment',
      label: 'Credit → Invest %',
      content: percentLabel(creditToInvestment),
      className: 'text-violet-600 dark:text-violet-400',
    },
    {
      key: 'avg',
      label: 'Avg Daily Spend',
      content: <FormattedAmount value={avgDailySpend} />,
      className: 'text-foreground',
    },
    {
      key: 'count',
      label: 'Transactions',
      content: String(summary.transactionCount),
      className: 'text-foreground',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

export function AnalyticsKpisSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[88px] animate-pulse rounded-lg border border-surface bg-muted/40"
        />
      ))}
    </div>
  );
}
