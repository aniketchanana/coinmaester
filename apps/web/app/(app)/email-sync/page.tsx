import { Card, CardContent } from '@repo/ui/card';

import { EmailSyncTable } from '../../../components/email-sync-table';

export default function EmailSyncPage() {
  return (
    <Card className="shadow-sm pt-2 lg:flex lg:h-[calc(100dvh-5.5rem-2px)] lg:flex-col lg:overflow-hidden">
      <CardContent className="p-3 pt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <EmailSyncTable />
      </CardContent>
    </Card>
  );
}
