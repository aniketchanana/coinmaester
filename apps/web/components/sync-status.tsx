import { Button } from '@repo/ui/button';
import { RefreshCcw } from 'lucide-react';

type SyncStatusProps = {
  lastSyncedAt?: string | null;
  label?: string;
};

export function SyncStatus({
  lastSyncedAt = null,
  label = 'Gmail sync',
}: SyncStatusProps) {
  const formatted = lastSyncedAt
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lastSyncedAt))
    : 'Not synced yet';

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground">
          Last synced: {formatted}
        </p>
      </div>
      <Button className="shrink-0 cursor-pointer">
        <RefreshCcw />
        Sync
      </Button>
    </div>
  );
}
