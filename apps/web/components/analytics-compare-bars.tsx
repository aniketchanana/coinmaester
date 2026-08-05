'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';

import { useIncognito } from './incognito-provider';
import { ANALYTICS_SERIES_COLORS } from '../lib/analytics-chart-colors';
import { formatTransactionAmount } from '../lib/currency';
import type { AnalyticsSummary } from '../types/analytics';

export interface ComparePresetSeries {
  id: string;
  name: string;
  color: string;
  summary: AnalyticsSummary;
  startDate?: string | null;
  endDate?: string | null;
}

interface AnalyticsCompareBarsProps {
  series: ComparePresetSeries[];
}

export function AnalyticsCompareBars({ series }: AnalyticsCompareBarsProps) {
  const { isIncognito } = useIncognito();
  const data = series.map((item) => ({
    name: item.name,
    Debit: item.summary.totalDebit,
    Credit: item.summary.totalCredit,
    Investment: item.summary.totalInvestment,
  }));

  return (
    <Card className="min-w-0 overflow-hidden shadow-surface-sm">
      <CardHeader className="space-y-0 px-3 pb-2 pt-3 sm:px-6 sm:pt-6">
        <CardTitle className="text-sm sm:text-base">Totals by preset</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 sm:px-6 sm:pb-6">
        <div className="h-48 w-full min-w-0 sm:h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value) => {
                  const n = Number(value);
                  if (!Number.isFinite(n)) return '';
                  if (Math.abs(n) >= 1000) {
                    return `${Math.round(n / 1000)}k`;
                  }
                  return String(n);
                }}
              />
              <Tooltip
                formatter={(value) =>
                  formatTransactionAmount(Number(value ?? 0), {
                    hidden: isIncognito,
                  })
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="Debit"
                fill={ANALYTICS_SERIES_COLORS.debit}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Credit"
                fill={ANALYTICS_SERIES_COLORS.credit}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Investment"
                fill={ANALYTICS_SERIES_COLORS.investment}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
