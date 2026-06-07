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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';

import {
  fetchGmailMessages,
  gmailMessageKeys,
  retryGmailMessages,
} from '../lib/gmail-messages';
import type {
  GmailMessageRow,
  GmailMessageStatusFilter,
} from '../types/gmail-message';

const PAGE_SIZE = 10;
const POLL_INTERVAL_MS = 10_000;

const STATUS_OPTIONS: Array<{ value: GmailMessageStatusFilter; label: string }> =
  [
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
  const [statusFilter, setStatusFilter] =
    React.useState<GmailMessageStatusFilter>('ALL');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const queryParams = React.useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      status: statusFilter,
    }),
    [page, statusFilter],
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

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const rowIdsOnPage = rows.map((row) => row.id);
  const allRowsSelected =
    rowIdsOnPage.length > 0 &&
    rowIdsOnPage.every((id) => selectedIds.has(id));
  const someRowsSelected =
    rowIdsOnPage.some((id) => selectedIds.has(id)) && !allRowsSelected;

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
      for (const id of rowIdsOnPage) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const handleStatusFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setStatusFilter(event.target.value as GmailMessageStatusFilter);
    setPage(1);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full max-w-xs gap-2">
          <Label htmlFor="statusFilter">Status</Label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {selectedIds.size > 0 ? (
          <Button
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

      <Table>
        <TableHeader>
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
                disabled={rowIdsOnPage.length === 0}
                aria-label="Select all emails on this page"
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
        <TableBody>
          {isLoading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-32 text-center">
                <p className="text-sm text-muted-foreground">
                  Loading email sync status...
                </p>
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-32 text-center">
                <p className="text-sm text-destructive">
                  {(error as Error).message ||
                    'Failed to load email sync status'}
                </p>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-32 text-center">
                <p className="text-sm font-medium text-foreground">
                  No emails found
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Synced emails will appear here once Gmail sync runs.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const isSelected = selectedIds.has(row.id);

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      aria-label={`Select email ${row.id}`}
                      onCheckedChange={(checked) =>
                        toggleRowSelection(row, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {row.from || '—'}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {row.subject || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.internalDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.status)}>
                      {formatStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={retryMutation.isPending}
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

      {pagination && pagination.total > 0 ? (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
            items)
          </p>
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
  );
}
