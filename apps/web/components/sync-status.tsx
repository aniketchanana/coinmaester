'use client';

import { Button } from '@repo/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  fetchLatestSyncStatus,
  isSyncFailed,
  isSyncInProgress,
  syncKeys,
  triggerSync,
} from '../lib/sync';

const POLL_INTERVAL_MS = 10_000;
const SYNC_IN_PROGRESS_TOOLTIP =
  'A sync is already in progress. Please wait for it to finish.';

type SyncStatusProps = {
  label?: string;
};

export function SyncStatus({ label = 'Gmail sync' }: SyncStatusProps) {
  const queryClient = useQueryClient();
  const [pollUntilSettled, setPollUntilSettled] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: syncKeys.latest,
    queryFn: fetchLatestSyncStatus,
    refetchInterval: (query) => {
      const status = query.state.data?.lastSyncStatus;
      if (isSyncInProgress(status) || pollUntilSettled) {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });

  useEffect(() => {
    if (!isSyncInProgress(data?.lastSyncStatus)) {
      setPollUntilSettled(false);
    }
  }, [data?.lastSyncStatus]);

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: (response) => {
      if (response.status === 201) {
        toast.success(
          'We are syncing your data. This might take a few moments.',
        );
        setPollUntilSettled(true);
        void queryClient.invalidateQueries({ queryKey: syncKeys.latest });
      }
    },
    onError: () => {
      toast.error('Unable to start sync. Please try again.');
    },
  });

  const syncInProgress = isSyncInProgress(data?.lastSyncStatus);
  const lastSyncFailed = isSyncFailed(data?.lastSyncStatus);
  const isQueueing = syncMutation.isPending;
  const isDisabled = isLoading ? true : syncInProgress || isQueueing;

  const formatted = data?.lastSyncedTime
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.lastSyncedTime))
    : isLoading
      ? 'Loading…'
      : 'Not synced yet';

  const statusLine = lastSyncFailed
    ? data?.lastSyncedTime
      ? `Last sync failed. Last successful sync: ${formatted}`
      : 'Last sync failed.'
    : `Last synced: ${formatted}`;

  const syncButton = (
    <Button
      className="shrink-0 cursor-pointer"
      disabled={isDisabled}
      onClick={() => syncMutation.mutate()}
    >
      {<RefreshCcw className={`${isDisabled ? 'animate-spin' : ''}`} />}
      Sync
    </Button>
  );

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className={'text-sm text-muted-foreground'}>{statusLine}</p>
      </div>

      {syncInProgress && !isQueueing ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">{syncButton}</span>
            </TooltipTrigger>
            <TooltipContent>{SYNC_IN_PROGRESS_TOOLTIP}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        syncButton
      )}
    </div>
  );
}
