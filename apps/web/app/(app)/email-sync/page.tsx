import { Card, CardContent } from '@repo/ui/card';

import { EmailSyncTable } from '../../../components/email-sync-table';

export default function EmailSyncPage() {
  return (
    <Card className="shadow-sm pt-2">
      <CardContent className="p-3 pt-0">
        <EmailSyncTable />
      </CardContent>
    </Card>
  );
}
