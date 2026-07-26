'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';
import { cn } from '@repo/ui/lib/utils';

import { formatTransactionAmount } from '../lib/currency';
import type { ComparePresetSeries } from './analytics-compare-bars';
import { useIncognito } from './incognito-provider';

interface AnalyticsCompareMetricsProps {
  series: ComparePresetSeries[];
}

type MetricKind = 'currency' | 'percent' | 'number';

interface MetricRow {
  key: string;
  label: string;
  kind: MetricKind;
  getValue: (item: ComparePresetSeries) => number | null;
  /** For delta coloring: is a higher value "good" (green) or "bad" (red)? */
  higherIsBetter?: boolean;
}

const ROWS: MetricRow[] = [
  {
    key: 'credit',
    label: 'Total Income',
    kind: 'currency',
    getValue: (item) => item.summary.totalCredit,
    higherIsBetter: true,
  },
  {
    key: 'debit',
    label: 'Total Spend',
    kind: 'currency',
    getValue: (item) => item.summary.totalDebit,
    higherIsBetter: false,
  },
  {
    key: 'investment',
    label: 'Investments',
    kind: 'currency',
    getValue: (item) => item.summary.totalInvestment,
    higherIsBetter: true,
  },
  {
    key: 'net',
    label: 'Net (Income − Spend)',
    kind: 'currency',
    getValue: (item) => item.summary.totalCredit - item.summary.totalDebit,
    higherIsBetter: true,
  },
  {
    key: 'credit-to-invest',
    label: 'Credit → Invest %',
    kind: 'percent',
    getValue: (item) =>
      item.summary.totalCredit > 0
        ? (item.summary.totalInvestment / item.summary.totalCredit) * 100
        : null,
    higherIsBetter: true,
  },
  {
    key: 'avg-daily',
    label: 'Avg Daily Spend',
    kind: 'currency',
    getValue: (item) => item.summary.avgDailySpend,
    higherIsBetter: false,
  },
  {
    key: 'count',
    label: 'Transactions',
    kind: 'number',
    getValue: (item) => item.summary.transactionCount,
  },
];

export function AnalyticsCompareMetrics({
  series,
}: AnalyticsCompareMetricsProps) {
  const { isIncognito } = useIncognito();
  const showDelta = series.length === 2;

  const formatValue = (kind: MetricKind, value: number | null): string => {
    if (value === null || !Number.isFinite(value)) {
      return '—';
    }

    if (kind === 'currency') {
      return formatTransactionAmount(value, { hidden: isIncognito });
    }

    if (kind === 'percent') {
      return `${value.toFixed(1)}%`;
    }

    return String(Math.round(value));
  };

  const formatDelta = (
    kind: MetricKind,
    a: number | null,
    b: number | null,
  ): { text: string; positive: boolean | null } => {
    if (
      a === null ||
      b === null ||
      !Number.isFinite(a) ||
      !Number.isFinite(b)
    ) {
      return { text: '—', positive: null };
    }

    const diff = b - a;
    if (Math.abs(diff) < 0.0001) {
      return { text: '—', positive: null };
    }

    const sign = diff > 0 ? '+' : '−';
    const magnitude = Math.abs(diff);
    let body: string;
    if (kind === 'currency') {
      body = formatTransactionAmount(magnitude, { hidden: isIncognito });
    } else if (kind === 'percent') {
      body = `${magnitude.toFixed(1)}pp`;
    } else {
      body = String(Math.round(magnitude));
    }

    return { text: `${sign}${body}`, positive: diff > 0 };
  };

  return (
    <Card className="shadow-surface-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Metrics comparison</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Metric</th>
                {series.map((item) => (
                  <th
                    key={item.id}
                    className="px-4 py-2 text-right font-medium"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>
                  </th>
                ))}
                {showDelta ? (
                  <th className="py-2 pl-4 text-right font-medium">Δ</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const values = series.map((item) => row.getValue(item));
                const delta = showDelta
                  ? formatDelta(row.kind, values[0] ?? null, values[1] ?? null)
                  : null;

                let deltaClass = 'text-muted-foreground';
                if (delta?.positive !== null && delta?.positive !== undefined) {
                  const good =
                    row.higherIsBetter === undefined
                      ? null
                      : delta.positive === row.higherIsBetter;
                  if (good === true) {
                    deltaClass = 'text-emerald-600 dark:text-emerald-400';
                  } else if (good === false) {
                    deltaClass = 'text-rose-600 dark:text-rose-400';
                  }
                }

                return (
                  <tr
                    key={row.key}
                    className="border-b border-surface/60 last:border-0"
                  >
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {row.label}
                    </td>
                    {values.map((value, index) => (
                      <td
                        key={series[index]?.id ?? index}
                        className="px-4 py-2.5 text-right font-semibold tabular-nums"
                      >
                        {formatValue(row.kind, value)}
                      </td>
                    ))}
                    {delta ? (
                      <td
                        className={cn(
                          'py-2.5 pl-4 text-right font-medium tabular-nums',
                          deltaClass,
                        )}
                      >
                        {delta.text}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
