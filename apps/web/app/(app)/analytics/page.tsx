import { Card, CardContent } from '@repo/ui/card';

import { AnalyticsDashboard } from '../../../components/analytics-dashboard';

export default function AnalyticsPage() {
  return (
    <Card className="shadow-sm pt-2">
      <CardContent className="p-2 pt-0 sm:p-3 sm:pt-0">
        <AnalyticsDashboard />
      </CardContent>
    </Card>
  );
}
