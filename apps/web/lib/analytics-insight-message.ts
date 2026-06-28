import type { AnalyticsInsight } from '../types/analytics';
import { ANALYTICS_INSIGHT_TYPE } from '../types/analytics';

const INCOGNITO_INSIGHT_MESSAGES = {
  [ANALYTICS_INSIGHT_TYPE.SPEND_INCREASE]:
    'Spending increased compared to the previous period.',
  [ANALYTICS_INSIGHT_TYPE.SPEND_DECREASE]:
    'Spending decreased compared to the previous period.',
  [ANALYTICS_INSIGHT_TYPE.TOP_PAYEE]:
    'Top merchant by spend is hidden in incognito mode.',
  [ANALYTICS_INSIGHT_TYPE.INVESTMENT_SHARE]:
    'Investments represent a portion of your total outflow.',
  [ANALYTICS_INSIGHT_TYPE.NET_POSITIVE]:
    'Net cashflow is positive for this period.',
  [ANALYTICS_INSIGHT_TYPE.NET_NEGATIVE]:
    'Spending exceeded income for this period.',
} as const;

export function getAnalyticsInsightMessage(
  insight: AnalyticsInsight,
  isIncognito: boolean,
): string {
  if (!isIncognito) {
    return insight.message;
  }

  return INCOGNITO_INSIGHT_MESSAGES[insight.type] ?? insight.message;
}
