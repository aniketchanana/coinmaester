'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, StickyNote, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@repo/ui/table';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { cn } from '@repo/ui/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

import { TRANSACTION_FILTER_TYPE } from '@repo/constant';

import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useResizableColumns } from '../hooks/use-resizable-columns';
import { formatTransactionAmount } from '../lib/currency';
import {
  deleteTransaction,
  fetchTransactions,
  transactionKeys,
  updateTransaction,
} from '../lib/transactions';
import type {
  ListTransactionsResponse,
  TransactionRow,
  TransactionSortField,
  TransactionSortOrder,
} from '../types/transaction';
import {
  TRANSACTION_SORT_FIELD,
  TRANSACTION_SORT_ORDER,
} from '../types/transaction';
import { DateRangePicker } from './date-range-picker';
import {
  ResizableSortableTableHead,
  ResizableTableHead,
} from './resizable-table-head';
import { TransactionCreateDialog } from './transaction-create-dialog';
import { TransactionEditDialog } from './transaction-edit-dialog';
import { TransactionNotesDialog } from './transaction-notes-dialog';
import { TransactionTypeBadge } from './transaction-type-badge';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const FILTER_DEBOUNCE_MS = 400;

const TRANSACTION_TABLE_COLUMNS = {
  bank: 'bank',
  amount: 'amount',
  type: 'type',
  date: 'date',
  payee: 'payee',
  actions: 'actions',
} as const;

type TransactionTableColumn =
  (typeof TRANSACTION_TABLE_COLUMNS)[keyof typeof TRANSACTION_TABLE_COLUMNS];

const DEFAULT_TRANSACTION_COLUMN_WIDTHS: Record<TransactionTableColumn, number> =
  {
    bank: 140,
    amount: 120,
    type: 130,
    date: 130,
    payee: 220,
    actions: 160,
  };

const TRANSACTION_TABLE_COLUMN_WIDTHS_STORAGE_KEY =
  'finance-app:transactions-table-column-widths';

const SELECT_CLASSNAME =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface TransactionFilters {
  startDate: string;
  endDate: string;
  payee: string;
  type: string;
}

const DEFAULT_FILTERS: TransactionFilters = {
  startDate: '',
  endDate: '',
  payee: '',
  type: '',
};

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate));
}

export function TransactionsTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<PageSize>(100);
  const [filters, setFilters] =
    React.useState<TransactionFilters>(DEFAULT_FILTERS);
  const debouncedFilters = useDebouncedValue(filters, FILTER_DEBOUNCE_MS);
  const [sortBy, setSortBy] = React.useState<TransactionSortField>(
    TRANSACTION_SORT_FIELD.TRANSACTION_DATE,
  );
  const [sortOrder, setSortOrder] = React.useState<TransactionSortOrder>(
    TRANSACTION_SORT_ORDER.DESC,
  );
  const [editingTransaction, setEditingTransaction] =
    React.useState<TransactionRow | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    React.useState<TransactionRow | null>(null);
  const [notesTransaction, setNotesTransaction] =
    React.useState<TransactionRow | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const { columnWidths, startResize } = useResizableColumns(
    DEFAULT_TRANSACTION_COLUMN_WIDTHS,
    TRANSACTION_TABLE_COLUMN_WIDTHS_STORAGE_KEY,
  );

  React.useEffect(() => {
    setPage(1);
  }, [
    debouncedFilters.payee,
    debouncedFilters.type,
    debouncedFilters.startDate,
    debouncedFilters.endDate,
    pageSize,
  ]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      toast.success('Transaction deleted');
      setDeletingTransaction(null);
      setEditingTransaction(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete transaction');
    },
  });

  const investmentMutation = useMutation({
    mutationFn: ({
      id,
      isInvestment,
    }: {
      id: string;
      isInvestment: boolean;
    }) => updateTransaction(id, { isInvestment }),
    onMutate: async ({ id, isInvestment }) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });

      const previousQueries = queryClient.getQueriesData<ListTransactionsResponse>(
        { queryKey: transactionKeys.all },
      );

      queryClient.setQueriesData<ListTransactionsResponse>(
        { queryKey: transactionKeys.all },
        (cached) => {
          if (!cached) {
            return cached;
          }

          return {
            ...cached,
            data: cached.data.map((row) =>
              row.id === id ? { ...row, isInvestment } : row,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onSuccess: (_updated, { isInvestment }) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      toast.success(
        isInvestment ? 'Marked as investment' : 'Unmarked as investment',
      );
    },
    onError: (error: Error, _variables, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(error.message || 'Failed to update investment status');
    },
  });

  const queryParams = React.useMemo(
    () => ({
      page,
      limit: pageSize,
      startDate: debouncedFilters.startDate || undefined,
      endDate: debouncedFilters.endDate || undefined,
      payee: debouncedFilters.payee || undefined,
      type:
        debouncedFilters.type === TRANSACTION_FILTER_TYPE.DEBIT ||
        debouncedFilters.type === TRANSACTION_FILTER_TYPE.CREDIT ||
        debouncedFilters.type === TRANSACTION_FILTER_TYPE.INVESTMENT
          ? debouncedFilters.type
          : undefined,
      sortBy,
      sortOrder,
    }),
    [page, pageSize, debouncedFilters, sortBy, sortOrder],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: transactionKeys.list(queryParams),
    queryFn: () => fetchTransactions(queryParams),
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const aggregate = data?.aggregate;

  const handleSort = (field: TransactionSortField) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder((current) =>
        current === TRANSACTION_SORT_ORDER.DESC
          ? TRANSACTION_SORT_ORDER.ASC
          : TRANSACTION_SORT_ORDER.DESC,
      );
      return;
    }

    setSortBy(field);
    setSortOrder(TRANSACTION_SORT_ORDER.DESC);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSortBy(TRANSACTION_SORT_FIELD.TRANSACTION_DATE);
    setSortOrder(TRANSACTION_SORT_ORDER.DESC);
    setPage(1);
  };

  const hasActiveFilters =
    filters.payee !== '' ||
    filters.type !== '' ||
    filters.startDate !== '' ||
    filters.endDate !== '' ||
    sortBy !== TRANSACTION_SORT_FIELD.TRANSACTION_DATE ||
    sortOrder !== TRANSACTION_SORT_ORDER.DESC;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add transaction
        </Button>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="payee">Payee</Label>
            <Input
              id="payee"
              placeholder="Search by payee"
              value={filters.payee}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setFilters((current) => ({
                  ...current,
                  payee: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className={SELECT_CLASSNAME}
              value={filters.type}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setFilters((current) => ({
                  ...current,
                  type: event.target.value,
                }))
              }
            >
              <option value="">All</option>
              <option value={TRANSACTION_FILTER_TYPE.DEBIT}>Debit</option>
              <option value={TRANSACTION_FILTER_TYPE.CREDIT}>Credit</option>
              <option value={TRANSACTION_FILTER_TYPE.INVESTMENT}>
                Investment
              </option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dateRange">Date range</Label>
            <DateRangePicker
              id="dateRange"
              value={{
                startDate: filters.startDate,
                endDate: filters.endDate,
              }}
              onChange={(dateRange) =>
                setFilters((current) => ({
                  ...current,
                  startDate: dateRange.startDate,
                  endDate: dateRange.endDate,
                }))
              }
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear
          </Button>
        </div>
      </div>

      {aggregate ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total debit</p>
            <p className="text-2xl font-semibold">
              {formatTransactionAmount(aggregate.totalDebit)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total credit</p>
            <p className="text-2xl font-semibold">
              {formatTransactionAmount(aggregate.totalCredit)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Investments made</p>
            <p className="text-2xl font-semibold">
              {formatTransactionAmount(aggregate.totalInvestment)}
            </p>
          </div>
        </div>
      ) : null}

      <TooltipProvider>
      <Table className="table-fixed">
        <colgroup>
          {Object.values(TRANSACTION_TABLE_COLUMNS).map((columnId) => (
            <col key={columnId} style={{ width: columnWidths[columnId] }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <ResizableTableHead
              onResizeStart={(clientX) =>
                startResize(TRANSACTION_TABLE_COLUMNS.bank, clientX)
              }
            >
              Bank
            </ResizableTableHead>
            <ResizableSortableTableHead
              label="Amount"
              field={TRANSACTION_SORT_FIELD.TRANSACTION_VALUE}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onResizeStart={(clientX) =>
                startResize(TRANSACTION_TABLE_COLUMNS.amount, clientX)
              }
            />
            <ResizableTableHead
              onResizeStart={(clientX) =>
                startResize(TRANSACTION_TABLE_COLUMNS.type, clientX)
              }
            >
              Type
            </ResizableTableHead>
            <ResizableSortableTableHead
              label="Date"
              field={TRANSACTION_SORT_FIELD.TRANSACTION_DATE}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onResizeStart={(clientX) =>
                startResize(TRANSACTION_TABLE_COLUMNS.date, clientX)
              }
            />
            <ResizableTableHead
              onResizeStart={(clientX) =>
                startResize(TRANSACTION_TABLE_COLUMNS.payee, clientX)
              }
            >
              Payee
            </ResizableTableHead>
            <ResizableTableHead
              className="text-right"
              onResizeStart={(clientX) =>
                startResize(TRANSACTION_TABLE_COLUMNS.actions, clientX)
              }
            >
              Actions
            </ResizableTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-32 text-center">
                <p className="text-sm text-muted-foreground">
                  Loading transactions...
                </p>
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-32 text-center">
                <p className="text-sm text-destructive">
                  {(error as Error).message || 'Failed to load transactions'}
                </p>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-32 text-center">
                <p className="text-sm font-medium text-foreground">
                  No transactions yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  They will show up here once your email sync is connected.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(row.isInvestment && 'bg-emerald-500/5')}
              >
                <TableCell className="truncate font-medium">
                  {row.bankName}
                </TableCell>
                <TableCell className="truncate">
                  {formatTransactionAmount(row.transactionValue)}
                </TableCell>
                <TableCell className="truncate">
                  {row.isInvestment ? (
                    <Badge
                      variant="secondary"
                      className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700"
                    >
                      Investment
                    </Badge>
                  ) : (
                    <TransactionTypeBadge type={row.type} />
                  )}
                </TableCell>
                <TableCell className="truncate text-muted-foreground">
                  {formatDate(row.transactionDate)}
                </TableCell>
                <TableCell className="truncate">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block cursor-default truncate">
                        {row.paymentMadeTo}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{row.paymentMadeTo}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={investmentMutation.isPending}
                          aria-pressed={row.isInvestment}
                          aria-label={
                            row.isInvestment
                              ? 'Unmark as investment'
                              : 'Mark as investment'
                          }
                          className={cn(
                            'transition-colors',
                            row.isInvestment
                              ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 hover:text-emerald-700'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onClick={() => {
                            investmentMutation.mutate({
                              id: row.id,
                              isInvestment: !row.isInvestment,
                            });
                          }}
                        >
                          <TrendingUp
                            className={cn(
                              'h-4 w-4 transition-colors',
                              row.isInvestment
                                ? 'fill-emerald-600 text-emerald-600'
                                : 'text-current',
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {row.isInvestment
                          ? 'Unmark as investment'
                          : 'Mark as investment'}
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Add or edit notes"
                      onClick={() => setNotesTransaction(row)}
                    >
                      <StickyNote
                        className={cn(
                          'h-4 w-4',
                          row.notes && 'fill-primary text-primary',
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit transaction ${row.id}`}
                      onClick={() => setEditingTransaction(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete transaction ${row.id}`}
                      onClick={() => setDeletingTransaction(row)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </TooltipProvider>

      {pagination && pagination.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
              items)
            </p>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="pageSize"
                className="whitespace-nowrap text-sm text-muted-foreground"
              >
                Rows per page
              </Label>
              <select
                id="pageSize"
                className={cn(SELECT_CLASSNAME, 'w-auto')}
                value={pageSize}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setPageSize(Number(event.target.value) as PageSize)
                }
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
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

      <TransactionCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <TransactionEditDialog
        transaction={editingTransaction}
        open={editingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTransaction(null);
          }
        }}
        onDelete={(transaction) => {
          setEditingTransaction(null);
          setDeletingTransaction(transaction);
        }}
      />

      <TransactionNotesDialog
        transaction={notesTransaction}
        open={notesTransaction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNotesTransaction(null);
          }
        }}
      />

      <Dialog
        open={deletingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTransaction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete transaction</DialogTitle>
            <DialogDescription>
              This will permanently remove the transaction
              {deletingTransaction
                ? ` from ${deletingTransaction.bankName} (${formatTransactionAmount(deletingTransaction.transactionValue)})`
                : ''}
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingTransaction(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingTransaction) {
                  deleteMutation.mutate(deletingTransaction.id);
                }
              }}
              disabled={deleteMutation.isPending || !deletingTransaction}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
