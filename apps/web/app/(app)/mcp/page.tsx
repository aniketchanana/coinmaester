import { Card, CardContent } from '@repo/ui/card';

import { McpApiKeys } from '../../../components/mcp-api-keys';
import { McpConnectionGuide } from '../../../components/mcp-connection-guide';

export default function McpPage() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <McpApiKeys />
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <McpConnectionGuide />
        </CardContent>
      </Card>
    </div>
  );
}
