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
    <Card className="shadow-surface-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Totals by preset</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full min-w-0 sm:h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value) =>
                  formatTransactionAmount(Number(value ?? 0), {
                    hidden: isIncognito,
                  })
                }
              />
              <Legend />
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
