'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';

import { ANALYTICS_SERIES_COLORS } from '../lib/analytics-chart-colors';
import { formatTransactionAmount } from '../lib/currency';
import type { AnalyticsSummary } from '../types/analytics';
import { useIncognito } from './incognito-provider';

const REMAINING_COLOR = '#64748b'; // slate-500

interface AnalyticsBreakdownPieProps {
  summary: AnalyticsSummary;
}

interface PieSlice {
  name: string;
  value: number;
  color: string;
  percentOfCredit: number;
}

export function AnalyticsBreakdownPie({ summary }: AnalyticsBreakdownPieProps) {
  const { isIncognito } = useIncognito();
  const credit = summary.totalCredit;
  const debit = summary.totalDebit;
  const investment = summary.totalInvestment;
  const remaining = Math.max(0, credit - debit - investment);

  const creditToInvestPercent = credit > 0 ? (investment / credit) * 100 : null;

  const data: PieSlice[] =
    credit <= 0
      ? []
      : [
          {
            name: 'Debit',
            value: debit,
            color: ANALYTICS_SERIES_COLORS.debit,
            percentOfCredit: (debit / credit) * 100,
          },
          {
            name: 'Investment',
            value: investment,
            color: ANALYTICS_SERIES_COLORS.investment,
            percentOfCredit: (investment / credit) * 100,
          },
          {
            name: 'Remaining',
            value: remaining,
            color: REMAINING_COLOR,
            percentOfCredit: (remaining / credit) * 100,
          },
        ].filter((item) => item.value > 0);

  return (
    <Card className="min-w-0 overflow-hidden shadow-surface-sm">
      <CardHeader className="space-y-1 px-3 pb-2 pt-3 sm:px-6 sm:pt-6">
        <CardTitle className="text-sm sm:text-base">Credit allocation</CardTitle>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {creditToInvestPercent !== null ? (
            <>
              Credit → invest:{' '}
              <span className="font-medium text-violet-600 dark:text-violet-400">
                {creditToInvestPercent.toFixed(1)}%
              </span>
            </>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 sm:px-6 sm:pb-6">
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No credit in this period to allocate.
          </p>
        ) : (
          <div className="relative h-56 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) => {
                    const amount = formatTransactionAmount(Number(value ?? 0), {
                      hidden: isIncognito,
                    });
                    const percent = (item?.payload as PieSlice | undefined)
                      ?.percentOfCredit;
                    const percentLabel =
                      percent !== undefined
                        ? ` (${percent.toFixed(1)}% of credit)`
                        : '';
                    return [`${amount}${percentLabel}`, name];
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute left-1/2 top-[42%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <p className="text-xs text-muted-foreground">Credit</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatTransactionAmount(credit, { hidden: isIncognito })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
