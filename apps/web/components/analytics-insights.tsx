'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  Lightbulb,
  PiggyBank,
  Store,
  TrendingUp,
} from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { AnalyticsInsight } from '../types/analytics';
import { ANALYTICS_INSIGHT_TYPE } from '../types/analytics';
import { useIncognitoFormatters } from '../hooks/use-incognito-formatters';
import { getAnalyticsInsightMessage } from '../lib/analytics-insight-message';
import { REVEAL_UP_CLASS, staggerDelay } from '../lib/motion';

const INSIGHT_ICONS = {
  [ANALYTICS_INSIGHT_TYPE.SPEND_INCREASE]: ArrowUpRight,
  [ANALYTICS_INSIGHT_TYPE.SPEND_DECREASE]: ArrowDownRight,
  [ANALYTICS_INSIGHT_TYPE.TOP_PAYEE]: Store,
  [ANALYTICS_INSIGHT_TYPE.INVESTMENT_SHARE]: TrendingUp,
  [ANALYTICS_INSIGHT_TYPE.NET_POSITIVE]: PiggyBank,
  [ANALYTICS_INSIGHT_TYPE.NET_NEGATIVE]: ArrowUpRight,
} as const;

interface AnalyticsInsightsProps {
  insights: AnalyticsInsight[];
}

export function AnalyticsInsights({ insights }: AnalyticsInsightsProps) {
  const { isIncognito } = useIncognitoFormatters();

  if (!insights.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Insights</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight, index) => {
          const Icon = INSIGHT_ICONS[insight.type] ?? Lightbulb;

          return (
            <div
              key={`${insight.type}-${index}`}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-surface bg-card p-4 shadow-surface-sm backdrop-blur-surface',
                REVEAL_UP_CLASS,
              )}
              style={staggerDelay(index)}
            >
              <div className="rounded-md bg-muted p-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {getAnalyticsInsightMessage(insight, isIncognito)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsInsightsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-lg border border-surface bg-card"
          />
        ))}
      </div>
    </div>
  );
}
