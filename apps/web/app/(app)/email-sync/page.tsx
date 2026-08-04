import { Card, CardContent } from '@repo/ui/card';

import { EmailSyncTable } from '../../../components/email-sync-table';
import { isAiParsingEnabled } from '../../../lib/ai-parsing';

export default function EmailSyncPage() {
  return (
    <div className="space-y-3 lg:flex lg:h-[calc(100dvh-5.5rem-2px)] lg:flex-col lg:gap-3 lg:space-y-0 lg:overflow-hidden">
      {!isAiParsingEnabled ? (
        <div
          className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          This feature is disabled for now — we are working on enabling it in
          production for a wider audience. Meanwhile, you can enjoy email
          syncing with AI parsing on a self-hosted platform.
        </div>
      ) : null}
      <Card className="shadow-sm pt-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
        <CardContent className="p-3 pt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <EmailSyncTable />
        </CardContent>
      </Card>
    </div>
  );
}
