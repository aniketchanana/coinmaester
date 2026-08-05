'use client';

import { format } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';

import { useIncognito } from './incognito-provider';
import { ANALYTICS_SERIES_COLORS } from '../lib/analytics-chart-colors';
import { formatTransactionAmount } from '../lib/currency';
import type { AnalyticsTrendPoint } from '../types/analytics';

interface AnalyticsDailySpendChartProps {
  trends: AnalyticsTrendPoint[];
  granularityLabel?: string;
}

export function AnalyticsDailySpendChart({
  trends,
  granularityLabel = 'Day by day',
}: AnalyticsDailySpendChartProps) {
  const { isIncognito } = useIncognito();
  const isMonthly = granularityLabel.toLowerCase().includes('month');
  const data = trends.map((point) => ({
    date: format(
      new Date(point.date),
      isMonthly ? 'MMM yyyy' : 'dd MMM',
    ),
    amount: point.debit,
  }));

  return (
    <Card className="min-w-0 overflow-hidden shadow-surface-sm">
      <CardHeader className="space-y-0 px-3 pb-2 pt-3 sm:px-6 sm:pt-6">
        <CardTitle className="text-sm sm:text-base">
          {granularityLabel} spend
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 sm:px-6 sm:pb-6">
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No spend data for this period.
          </p>
        ) : (
          <div className="h-44 w-full min-w-0 sm:h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(value) => {
                    const n = Number(value);
                    if (!Number.isFinite(n)) return '';
                    if (Math.abs(n) >= 100_000) {
                      return `${Math.round(n / 1000)}k`;
                    }
                    if (Math.abs(n) >= 1000) {
                      return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
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
                  labelFormatter={(label) => String(label)}
                />
                <Line
                  type="linear"
                  dataKey="amount"
                  name="Amount"
                  stroke={ANALYTICS_SERIES_COLORS.debit}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    stroke: ANALYTICS_SERIES_COLORS.debit,
                    strokeWidth: 1.5,
                    fill: 'var(--card, #fff)',
                  }}
                  activeDot={{
                    r: 5,
                    stroke: ANALYTICS_SERIES_COLORS.debit,
                    strokeWidth: 2,
                    fill: 'var(--card, #fff)',
                  }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
