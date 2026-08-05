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

import { cn } from '@repo/ui/lib/utils';

import { isAiParsingEnabled } from '../lib/ai-parsing';
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
const SYNC_DISABLED_TOOLTIP =
  'Sync is temporarily disabled. AI email parsing is not available in this environment.';

type SyncStatusProps = {
  /** Where to show the “Last synced…” line. Default hides it below md. */
  statusVisibility?: 'always' | 'md-up' | 'never';
  className?: string;
  /** Hide the Sync button (e.g. when only showing status in a sheet). */
  showButton?: boolean;
};

export function SyncStatus({
  statusVisibility = 'md-up',
  className,
  showButton = true,
}: SyncStatusProps) {
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
  const isDisabled =
    !isAiParsingEnabled || isLoading || syncInProgress || isQueueing;

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
      className="h-9 shrink-0 cursor-pointer gap-1.5 px-2.5 md:px-3"
      disabled={isDisabled}
      onClick={() => {
        if (!isAiParsingEnabled) return;
        syncMutation.mutate();
      }}
      size="sm"
      aria-label="Sync"
    >
      <RefreshCcw
        className={
          isAiParsingEnabled && (syncInProgress || isQueueing)
            ? 'animate-spin'
            : undefined
        }
      />
      <span className="hidden sm:inline">Sync</span>
    </Button>
  );

  // Always prefer a useful tooltip: disabled/in-progress first, else last-synced.
  const tooltipContent = !isAiParsingEnabled
    ? SYNC_DISABLED_TOOLTIP
    : syncInProgress && !isQueueing
      ? SYNC_IN_PROGRESS_TOOLTIP
      : statusLine;

  const buttonWithTooltip = showButton ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{syncButton}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  const statusClassName =
    statusVisibility === 'always'
      ? 'max-w-[14rem] text-xs leading-snug text-muted-foreground'
      : statusVisibility === 'md-up'
        ? 'hidden max-w-[14rem] text-xs leading-snug text-muted-foreground xl:block'
        : 'hidden';

  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      {statusVisibility !== 'never' ? (
        <p className={statusClassName}>{statusLine}</p>
      ) : null}
      {buttonWithTooltip}
    </div>
  );
}
