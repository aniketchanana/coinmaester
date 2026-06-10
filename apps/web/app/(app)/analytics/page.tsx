import { Card, CardContent } from '@repo/ui/card';

import { AnalyticsDashboard } from '../../../components/analytics-dashboard';

export default function AnalyticsPage() {
  return (
    <Card className="shadow-sm pt-2">
      <CardContent className="p-3 pt-0">
        <AnalyticsDashboard />
      </CardContent>
    </Card>
  );
}
