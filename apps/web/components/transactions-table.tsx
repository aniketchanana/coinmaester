'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, StickyNote, Trash2, TrendingUp } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
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
  TableHeader,
  TableRow,
} from '@repo/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

import { TRANSACTION_FILTER_TYPE } from '@repo/constant';

import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useResizableColumns } from '../hooks/use-resizable-columns';
import { FormattedAmount } from './formatted-amount';
import { MaskedPayee } from './masked-payee';
import { analyticsKeys } from '../lib/analytics';
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
import {
  EMPTY_STATE_ENTER_CLASS,
  REVEAL_UP_CLASS,
  ROW_ENTER_CLASS,
  staggerDelay,
} from '../lib/motion';
import { DateRangePicker } from './date-range-picker';
import {
  ResizableSortableTableHead,
  ResizableTableHead,
} from './resizable-table-head';
import { TableSkeleton } from './table-skeleton';
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

const DEFAULT_TRANSACTION_COLUMN_WIDTHS: Record<
  TransactionTableColumn,
  number
> = {
  bank: 140,
  amount: 120,
  type: 130,
  date: 130,
  payee: 220,
  actions: 160,
};

const TRANSACTION_TABLE_COLUMN_WIDTHS_STORAGE_KEY =
  'finance-app:transactions-table-column-widths';

const TRANSACTIONS_TABLE_PAGE_SIZE_STORAGE_KEY =
  'finance-app:transactions-table-page-size';

function readStoredPageSize(): PageSize | null {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_TABLE_PAGE_SIZE_STORAGE_KEY);
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

const TYPE_FILTER_ALL = 'ALL';

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

function isTransactionToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function TransactionsTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<PageSize>(100);

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
        TRANSACTIONS_TABLE_PAGE_SIZE_STORAGE_KEY,
        String(size),
      );
    } catch {
      // Ignore storage write failures.
    }
  }, []);
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
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      toast.success('Transaction deleted');
      setDeletingTransaction(null);
      setEditingTransaction(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete transaction');
    },
  });

  const investmentMutation = useMutation({
    mutationFn: ({ id, isInvestment }: { id: string; isInvestment: boolean }) =>
      updateTransaction(id, { isInvestment }),
    onMutate: async ({ id, isInvestment }) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });

      const previousQueries =
        queryClient.getQueriesData<ListTransactionsResponse>({
          queryKey: transactionKeys.all,
        });

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
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
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
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-start">
      <aside className="order-1 w-full min-w-0 shrink-0 lg:order-none lg:max-h-full lg:w-72 lg:overflow-x-hidden lg:overflow-y-auto xl:w-80">
        <div className="min-w-0 space-y-4">
          <Button className="w-full" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add transaction
          </Button>

          <div
            className={cn(
              'min-w-0 space-y-4 rounded-lg border border-surface bg-card p-4 shadow-surface-sm backdrop-blur-surface',
              REVEAL_UP_CLASS,
            )}
          >
            <div className="grid min-w-0 gap-4">
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
                <Select
                  value={filters.type || TYPE_FILTER_ALL}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      type: value === TYPE_FILTER_ALL ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TYPE_FILTER_ALL}>All</SelectItem>
                    <SelectItem value={TRANSACTION_FILTER_TYPE.DEBIT}>
                      Debit
                    </SelectItem>
                    <SelectItem value={TRANSACTION_FILTER_TYPE.CREDIT}>
                      Credit
                    </SelectItem>
                    <SelectItem value={TRANSACTION_FILTER_TYPE.INVESTMENT}>
                      Investment
                    </SelectItem>
                  </SelectContent>
                </Select>
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
            <Button
              variant="outline"
              className="w-full"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Clear
            </Button>
          </div>
        </div>
      </aside>

      <div className="order-3 min-w-0 flex-1 space-y-4 lg:order-none lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        <TooltipProvider>
          <Table
            className="table-fixed table-surface-rows"
            containerClassName="lg:min-h-0 lg:flex-1"
          >
            <colgroup>
              {Object.values(TRANSACTION_TABLE_COLUMNS).map((columnId) => (
                <col key={columnId} style={{ width: columnWidths[columnId] }} />
              ))}
            </colgroup>
            <TableHeader className="table-sticky-header">
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
            <TableBody key={`${page}-${pageSize}-${sortBy}-${sortOrder}`}>
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center">
                    <p className="text-sm text-destructive">
                      {(error as Error).message ||
                        'Failed to load transactions'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className={EMPTY_STATE_ENTER_CLASS}>
                      <p className="text-sm font-medium text-foreground">
                        No transactions yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        They will show up here once your email sync is
                        connected.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, rowIndex) => {
                  const isToday = isTransactionToday(row.transactionDate);

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        ROW_ENTER_CLASS,
                        isToday
                          ? 'bg-amber-500/10! hover:bg-amber-500/15!'
                          : row.isInvestment && 'bg-emerald-500/5!',
                      )}
                      style={staggerDelay(rowIndex)}
                    >
                      <TableCell className="truncate font-medium">
                        {row.bankName}
                      </TableCell>
                      <TableCell className="truncate">
                        <FormattedAmount value={row.transactionValue} />
                      </TableCell>
                      <TableCell className="truncate">
                        <TransactionTypeBadge
                          type={row.type}
                          isInvestment={row.isInvestment}
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          'truncate',
                          isToday
                            ? 'font-medium text-amber-700 dark:text-amber-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatDate(row.transactionDate)}
                      </TableCell>
                      <TableCell className="truncate">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block cursor-default truncate">
                              <MaskedPayee value={row.paymentMadeTo} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <MaskedPayee value={row.paymentMadeTo} />
                          </TooltipContent>
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

      {aggregate ? (
        <aside className="order-2 w-full min-w-0 shrink-0 lg:order-none lg:max-h-full lg:w-64 lg:overflow-x-hidden lg:overflow-y-auto xl:w-72">
          <div
            className={cn(
              'space-y-4 rounded-lg border border-surface bg-card p-4 shadow-surface-sm backdrop-blur-surface',
              REVEAL_UP_CLASS,
            )}
          >
            <p className="text-sm font-medium">Summary</p>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total debit</p>
                <p className="text-xl font-semibold">
                  <FormattedAmount value={aggregate.totalDebit} />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total credit</p>
                <p className="text-xl font-semibold">
                  <FormattedAmount value={aggregate.totalCredit} />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Investments made
                </p>
                <p className="text-xl font-semibold">
                  <FormattedAmount value={aggregate.totalInvestment} />
                </p>
              </div>
            </div>
          </div>
        </aside>
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
              {deletingTransaction ? (
                <>
                  {` from ${deletingTransaction.bankName} (`}
                  <FormattedAmount
                    value={deletingTransaction.transactionValue}
                  />
                  )
                </>
              ) : null}
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
