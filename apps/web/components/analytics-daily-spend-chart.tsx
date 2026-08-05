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
    <Card className="shadow-surface-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{granularityLabel} spend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No spend data for this period.
          </p>
        ) : (
          <div className="h-48 w-full min-w-0 sm:h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 4, left: -12, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine
                  minTickGap={16}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  label={{
                    value: 'Date',
                    position: 'insideBottom',
                    offset: -18,
                    style: { fontSize: 12 },
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine
                  width={64}
                  label={{
                    value: 'Amount',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, textAnchor: 'middle' },
                  }}
                />
                <Tooltip
                  formatter={(value) =>
                    formatTransactionAmount(Number(value ?? 0), {
                      hidden: isIncognito,
                    })
                  }
                  labelFormatter={(label) => `Date: ${String(label)}`}
                />
                <Line
                  type="linear"
                  dataKey="amount"
                  name="Amount"
                  stroke={ANALYTICS_SERIES_COLORS.debit}
                  strokeWidth={2.5}
                  dot={{
                    r: 5,
                    stroke: ANALYTICS_SERIES_COLORS.debit,
                    strokeWidth: 2,
                    fill: 'var(--card, #fff)',
                  }}
                  activeDot={{
                    r: 7,
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
