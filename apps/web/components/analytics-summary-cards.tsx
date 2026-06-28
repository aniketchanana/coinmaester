'use client';

import { cn } from '@repo/ui/lib/utils';

import { REVEAL_UP_CLASS, staggerDelay } from '../lib/motion';
import type { AnalyticsSummary } from '../types/analytics';
import { FormattedAmount } from './formatted-amount';

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
}

const CARDS = [
  {
    key: 'debit',
    label: 'Total Spend',
    valueKey: 'totalDebit' as const,
    signed: false,
    className: 'text-amber-600 dark:text-amber-500',
  },
  {
    key: 'credit',
    label: 'Total Income',
    valueKey: 'totalCredit' as const,
    signed: false,
    className: 'text-emerald-600 dark:text-emerald-500',
  },
  {
    key: 'investment',
    label: 'Investments',
    valueKey: 'totalInvestment' as const,
    signed: false,
    className: 'text-violet-600 dark:text-violet-400',
  },
  {
    key: 'bank',
    label: 'Est. in Bank',
    valueKey: 'estimatedBankBalance' as const,
    signed: true,
    className: '',
  },
  {
    key: 'net',
    label: 'Net Cashflow',
    valueKey: 'netCashflow' as const,
    signed: true,
    className: '',
  },
] as const;

export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {CARDS.map((card, index) => {
        const value = summary[card.valueKey];

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
                card.signed
                  ? value >= 0
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : 'text-amber-600 dark:text-amber-500'
                  : card.className,
              )}
            >
              {card.signed && value > 0 ? '+' : null}
              {card.signed && value < 0 ? '-' : null}
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
