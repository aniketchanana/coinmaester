'use client';

import { cn } from '@repo/ui/lib/utils';

import type { AnalyticsSummary } from '../types/analytics';
import { REVEAL_UP_CLASS, staggerDelay } from '../lib/motion';
import { FormattedAmount } from './formatted-amount';

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
}

const CARDS = [
  {
    key: 'debit',
    label: 'Total Spend',
    valueKey: 'totalDebit' as const,
    className: 'text-amber-600 dark:text-amber-500',
  },
  {
    key: 'credit',
    label: 'Total Income',
    valueKey: 'totalCredit' as const,
    className: 'text-emerald-600 dark:text-emerald-500',
  },
  {
    key: 'investment',
    label: 'Investments',
    valueKey: 'totalInvestment' as const,
    className: 'text-violet-600 dark:text-violet-400',
  },
  {
    key: 'net',
    label: 'Net Cashflow',
    valueKey: 'netCashflow' as const,
    className: '',
  },
] as const;

export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card, index) => {
        const value = summary[card.valueKey];
        const isNet = card.key === 'net';

        return (
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
                isNet
                  ? value >= 0
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : 'text-amber-600 dark:text-amber-500'
                  : card.className,
              )}
            >
              {isNet && value > 0 ? '+' : null}
              {isNet && value < 0 ? '-' : null}
              <FormattedAmount value={Math.abs(value)} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsSummaryCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="rounded-lg border border-surface bg-card p-4 shadow-surface-sm"
        >
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
