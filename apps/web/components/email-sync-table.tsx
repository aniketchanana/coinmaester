'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { JOB_STATUS, type JobStatus } from '@repo/constant/job-status';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Checkbox } from '@repo/ui/checkbox';
import { Label } from '@repo/ui/label';
import { cn } from '@repo/ui/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

import {
  EMPTY_STATE_ENTER_CLASS,
  REVEAL_UP_CLASS,
  ROW_ENTER_CLASS,
  staggerDelay,
} from '../lib/motion';
import {
  fetchGmailMessages,
  gmailMessageKeys,
  retryGmailMessages,
} from '../lib/gmail-messages';
import { MaskedSensitiveText } from './masked-sensitive-text';
import { TableSkeleton } from './table-skeleton';
import type {
  GmailMessageRow,
  GmailMessageStatusFilter,
} from '../types/gmail-message';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const POLL_INTERVAL_MS = 10_000;

const EMAIL_SYNC_TABLE_PAGE_SIZE_STORAGE_KEY =
  'finance-app:email-sync-table-page-size';

function readStoredPageSize(): PageSize | null {
  try {
    const raw = localStorage.getItem(EMAIL_SYNC_TABLE_PAGE_SIZE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    if (PAGE_SIZE_OPTIONS.includes(parsed as PageSize)) {
      return parsed as PageSize;
    }
  } catch {
    return null;
  }

  return null;
}

const STATUS_OPTIONS: Array<{
  value: GmailMessageStatusFilter;
  label: string;
}> = [
  { value: 'ALL', label: 'All statuses' },
  { value: JOB_STATUS.PENDING, label: 'Pending' },
  { value: JOB_STATUS.IN_PROGRESS, label: 'In progress' },
  { value: JOB_STATUS.COMPLETED, label: 'Completed' },
  { value: JOB_STATUS.FAILED, label: 'Failed' },
];

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function isActiveStatus(status: JobStatus): boolean {
  return status === JOB_STATUS.PENDING || status === JOB_STATUS.IN_PROGRESS;
}

function canRerun(status: JobStatus): boolean {
  return status === JOB_STATUS.COMPLETED || status === JOB_STATUS.FAILED;
}

function statusBadgeVariant(
  status: JobStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case JOB_STATUS.FAILED:
      return 'destructive';
    case JOB_STATUS.IN_PROGRESS:
      return 'default';
    case JOB_STATUS.COMPLETED:
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatStatusLabel(status: JobStatus): string {
  switch (status) {
    case JOB_STATUS.IN_PROGRESS:
      return 'In progress';
    case JOB_STATUS.PENDING:
      return 'Pending';
    case JOB_STATUS.COMPLETED:
      return 'Completed';
    case JOB_STATUS.FAILED:
      return 'Failed';
    default:
      return status;
  }
}

function showRetryToast(requeued: string[], skipped: string[]): void {
  if (requeued.length === 0) {
    toast.error('No emails were re-queued.');
    return;
  }

  if (skipped.length > 0) {
    toast.success(
      `Re-queued ${requeued.length} email(s). ${skipped.length} skipped.`,
    );
    return;
  }

  toast.success(
    requeued.length === 1
      ? 'Email re-queued for processing.'
      : `${requeued.length} emails re-queued for processing.`,
  );
}

export function EmailSyncTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<PageSize>(100);
  const [statusFilter, setStatusFilter] =
    React.useState<GmailMessageStatusFilter>('ALL');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const storedPageSize = readStoredPageSize();
    if (storedPageSize) {
      setPageSize(storedPageSize);
    }
  }, []);

  const handlePageSizeChange = React.useCallback((size: PageSize) => {
    setPageSize(size);
    try {
      localStorage.setItem(
        EMAIL_SYNC_TABLE_PAGE_SIZE_STORAGE_KEY,
        String(size),
      );
    } catch {
      // Ignore storage write failures.
    }
  }, []);

  React.useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [pageSize]);

  const queryParams = React.useMemo(
    () => ({
      page,
      limit: pageSize,
      status: statusFilter,
    }),
    [page, pageSize, statusFilter],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: gmailMessageKeys.list(queryParams),
    queryFn: () => fetchGmailMessages(queryParams),
    refetchInterval: (query) => {
      const rows = query.state.data?.data ?? [];
      const hasActiveRows = rows.some((row) => isActiveStatus(row.status));
      return hasActiveRows ? POLL_INTERVAL_MS : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: (ids: string[]) => retryGmailMessages(ids),
    onSuccess: (response) => {
      showRetryToast(response.requeued, response.skipped);
      setSelectedIds(new Set());
      void queryClient.invalidateQueries({ queryKey: gmailMessageKeys.all });
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || 'Failed to re-run email processing');
    },
  });

  const rows = React.useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;
  const rerunnableRowIds = rows
    .filter((row) => canRerun(row.status))
    .map((row) => row.id);

  // Polling can flip a selected row back to an active status (e.g. a re-run
  // triggered elsewhere); drop such rows so the bulk action never includes them.
  React.useEffect(() => {
    setSelectedIds((current) => {
      const blockedIds = rows
        .filter((row) => !canRerun(row.status) && current.has(row.id))
        .map((row) => row.id);

      if (blockedIds.length === 0) {
        return current;
      }

      const next = new Set(current);
      for (const id of blockedIds) {
        next.delete(id);
      }
      return next;
    });
  }, [rows]);
  const allRowsSelected =
    rerunnableRowIds.length > 0 &&
    rerunnableRowIds.every((id) => selectedIds.has(id));
  const someRowsSelected =
    rerunnableRowIds.some((id) => selectedIds.has(id)) && !allRowsSelected;

  const toggleRowSelection = (row: GmailMessageRow, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(row.id);
      } else {
        next.delete(row.id);
      }
      return next;
    });
  };

  const toggleSelectAllRows = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of rerunnableRowIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as GmailMessageStatusFilter);
    setPage(1);
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setPage(1);
    setSelectedIds(new Set());
  };

  const hasActiveFilters = statusFilter !== 'ALL';

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-start">
      <aside className="order-1 w-full min-w-0 shrink-0 lg:order-none lg:max-h-full lg:w-72 lg:overflow-x-hidden lg:overflow-y-auto xl:w-80">
        <div
          className={cn(
            'min-w-0 space-y-4 rounded-lg border border-surface bg-card p-4 shadow-surface-sm backdrop-blur-surface',
            REVEAL_UP_CLASS,
          )}
        >
          <div className="grid gap-2">
            <Label htmlFor="statusFilter">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger id="statusFilter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear
          </Button>

          {selectedIds.size > 0 ? (
            <Button
              className="w-full animate-in fade-in-0 slide-in-from-top-2 fill-mode-both duration-200 motion-reduce:animate-none"
              onClick={() => retryMutation.mutate([...selectedIds])}
              disabled={retryMutation.isPending}
            >
              <RefreshCcw
                className={retryMutation.isPending ? 'animate-spin' : undefined}
              />
              Re-run selected ({selectedIds.size})
            </Button>
          ) : null}
        </div>
      </aside>

      <div className="order-2 min-w-0 flex-1 space-y-4 lg:order-none lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        <TooltipProvider>
          <Table
            className="table-fixed table-surface-rows"
            containerClassName="lg:min-h-0 lg:flex-1"
          >
            <TableHeader className="table-sticky-header">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      allRowsSelected
                        ? true
                        : someRowsSelected
                          ? 'indeterminate'
                          : false
                    }
                    disabled={rerunnableRowIds.length === 0}
                    aria-label="Select all re-runnable emails on this page"
                    onCheckedChange={(checked) =>
                      toggleSelectAllRows(checked === true)
                    }
                  />
                </TableHead>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={`${page}-${pageSize}-${statusFilter}`}>
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className={EMPTY_STATE_ENTER_CLASS}>
                      <p className="text-sm text-destructive">
                        {(error as Error).message ||
                          'Failed to load email sync status'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className={EMPTY_STATE_ENTER_CLASS}>
                      <p className="text-sm font-medium text-foreground">
                        No emails found
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Synced emails will appear here once Gmail sync runs.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, rowIndex) => {
                  const rerunnable = canRerun(row.status);
                  const isSelected = rerunnable && selectedIds.has(row.id);

                  return (
                    <TableRow
                      key={row.id}
                      className={ROW_ENTER_CLASS}
                      style={staggerDelay(rowIndex)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          disabled={!rerunnable}
                          aria-label={`Select email ${row.id}`}
                          onCheckedChange={(checked) =>
                            toggleRowSelection(row, checked === true)
                          }
                        />
                      </TableCell>
                      <TableCell className="truncate font-medium">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block cursor-default truncate">
                              <MaskedSensitiveText value={row.from || '—'} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <MaskedSensitiveText value={row.from || '—'} />
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="truncate">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block cursor-default truncate">
                              <MaskedSensitiveText value={row.subject || '—'} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <MaskedSensitiveText value={row.subject || '—'} />
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(row.internalDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant(row.status)}
                          className={
                            row.status === JOB_STATUS.IN_PROGRESS
                              ? 'animate-pulse motion-reduce:animate-none'
                              : undefined
                          }
                        >
                          {formatStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!rerunnable || retryMutation.isPending}
                          onClick={() => retryMutation.mutate([row.id])}
                        >
                          Re-run
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TooltipProvider>

        {pagination && pagination.total > 0 ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} items)
              </p>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="pageSize"
                  className="whitespace-nowrap text-sm text-muted-foreground"
                >
                  Rows per page
                </Label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) =>
                    handlePageSizeChange(Number(value) as PageSize)
                  }
                >
                  <SelectTrigger
                    id="pageSize"
                    className="h-9 w-fit min-w-[5.5rem]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1),
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
