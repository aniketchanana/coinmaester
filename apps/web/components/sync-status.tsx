'use client';

import { Button } from '@repo/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import {
  fetchLatestSyncStatus,
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

  const { data, isLoading } = useQuery({
    queryKey: syncKeys.latest,
    queryFn: fetchLatestSyncStatus,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnMount: true,
  });

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: (response) => {
      if (response.status === 201) {
        toast.success(
          'We are syncing your data. This might take a few moments.',
        );
        void queryClient.invalidateQueries({ queryKey: syncKeys.latest });
      }
    },
    onError: () => {
      toast.error('Unable to start sync. Please try again.');
    },
  });

  const syncInProgress = isSyncInProgress(data?.lastSyncStatus);
  const isQueueing = syncMutation.isPending;
  const isDisabled = syncInProgress || isQueueing;

  const formatted = data?.lastSyncedTime
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.lastSyncedTime))
    : isLoading
      ? 'Loading…'
      : 'Not synced yet';

  const syncButton = (
    <Button
      className="shrink-0 cursor-pointer"
      disabled={isDisabled}
      onClick={() => syncMutation.mutate()}
    >
      {isQueueing ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
      Sync
    </Button>
  );

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground">
          Last synced: {formatted}
        </p>
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
