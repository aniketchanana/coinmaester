'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Pencil, Plus, StickyNote, Trash2, TrendingUp } from 'lucide-react';
import * as React from 'react';
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
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { cn } from '@repo/ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/popover';
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
import { analyticsKeys } from '../lib/analytics';
import {
  EMPTY_STATE_ENTER_CLASS,
  REVEAL_UP_CLASS,
  ROW_ENTER_CLASS,
  staggerDelay,
} from '../lib/motion';
import {
  fetchPresetFilters,
  presetFilterKeys,
  presetToFilters,
  type PresetFilter,
} from '../lib/preset-filters';
import {
  persistTransactionFilters,
  readStoredTransactionFilters,
} from '../lib/transaction-filters';
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
import { FormattedAmount } from './formatted-amount';
import { MaskedPayee } from './masked-payee';
import { PresetFilterEditDialog } from './preset-filter-edit-dialog';
import { PresetFilterSaveDialog } from './preset-filter-save-dialog';
import {
  ResizableSortableTableHead,
  ResizableTableHead,
} from './resizable-table-head';
import { TableSkeleton } from './table-skeleton';
import { TransactionCreateDialog } from './transaction-create-dialog';
import { TransactionEditDialog } from './transaction-edit-dialog';
import { TransactionNotesDialog } from './transaction-notes-dialog';
import { TransactionTypeBadge } from './transaction-type-badge';
import {
  TransactionsSummaryCards,
  TransactionsSummaryCardsSkeleton,
} from './transactions-summary-cards';

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
  'coinmaester:transactions-table-column-widths';

const TRANSACTIONS_TABLE_PAGE_SIZE_STORAGE_KEY =
  'coinmaester:transactions-table-page-size';

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

const PRESET_CHIP_COLORS = [
  'border-sky-500/40 bg-sky-500/15 text-sky-800 dark:bg-sky-500/25 dark:text-sky-200 hover:bg-sky-500/25 dark:hover:bg-sky-500/35',
  'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-200 hover:bg-emerald-500/25 dark:hover:bg-emerald-500/35',
  'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200 hover:bg-amber-500/25 dark:hover:bg-amber-500/35',
  'border-violet-500/40 bg-violet-500/15 text-violet-800 dark:bg-violet-500/25 dark:text-violet-200 hover:bg-violet-500/25 dark:hover:bg-violet-500/35',
  'border-rose-500/40 bg-rose-500/15 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200 hover:bg-rose-500/25 dark:hover:bg-rose-500/35',
  'border-cyan-500/40 bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500/25 dark:text-cyan-200 hover:bg-cyan-500/25 dark:hover:bg-cyan-500/35',
  'border-orange-500/40 bg-orange-500/15 text-orange-900 dark:bg-orange-500/25 dark:text-orange-200 hover:bg-orange-500/25 dark:hover:bg-orange-500/35',
  'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-800 dark:bg-fuchsia-500/25 dark:text-fuchsia-200 hover:bg-fuchsia-500/25 dark:hover:bg-fuchsia-500/35',
] as const;

function presetChipColorClass(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const color = PRESET_CHIP_COLORS[hash % PRESET_CHIP_COLORS.length];
  return color ?? PRESET_CHIP_COLORS[0]!;
}

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

function getInitialTransactionFilters(): {
  filters: TransactionFilters;
  sortBy: TransactionSortField;
  sortOrder: TransactionSortOrder;
} {
  const stored = readStoredTransactionFilters();
  return {
    filters: {
      startDate: stored.startDate,
      endDate: stored.endDate,
      payee: stored.payee,
      type: stored.type,
    },
    sortBy: stored.sortBy,
    sortOrder: stored.sortOrder,
  };
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}

function isTransactionToday(isoDate: string): boolean {
  return isoDate.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function TransactionsTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<PageSize>(
    () => readStoredPageSize() ?? 100,
  );

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
  const [filters, setFilters] = React.useState<TransactionFilters>(
    () => getInitialTransactionFilters().filters,
  );
  const debouncedFilters = useDebouncedValue(filters, FILTER_DEBOUNCE_MS);
  const [sortBy, setSortBy] = React.useState<TransactionSortField>(
    () => getInitialTransactionFilters().sortBy,
  );
  const [sortOrder, setSortOrder] = React.useState<TransactionSortOrder>(
    () => getInitialTransactionFilters().sortOrder,
  );
  const skipFilterPersistRef = React.useRef(true);

  React.useEffect(() => {
    if (skipFilterPersistRef.current) {
      skipFilterPersistRef.current = false;
      return;
    }

    persistTransactionFilters({ ...filters, sortBy, sortOrder });
  }, [filters, sortBy, sortOrder]);
  const [editingTransaction, setEditingTransaction] =
    React.useState<TransactionRow | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    React.useState<TransactionRow | null>(null);
  const [notesTransaction, setNotesTransaction] =
    React.useState<TransactionRow | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [savePresetDialogOpen, setSavePresetDialogOpen] = React.useState(false);
  const [editingPreset, setEditingPreset] = React.useState<PresetFilter | null>(
    null,
  );
  const [openPresetChipId, setOpenPresetChipId] = React.useState<string | null>(
    null,
  );
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

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const { data: todayData } = useQuery({
    queryKey: transactionKeys.list({
      page: 1,
      limit: 1,
      startDate: todayDate,
      endDate: todayDate,
      type: TRANSACTION_FILTER_TYPE.DEBIT,
    }),
    queryFn: () =>
      fetchTransactions({
        page: 1,
        limit: 1,
        startDate: todayDate,
        endDate: todayDate,
        type: TRANSACTION_FILTER_TYPE.DEBIT,
      }),
    staleTime: 60_000,
  });

  const { data: presetFilters = [] } = useQuery({
    queryKey: presetFilterKeys.list(),
    queryFn: fetchPresetFilters,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const aggregate = data?.aggregate;
  const spentToday = todayData?.aggregate.totalDebit ?? 0;

  const applyPresetFilter = (preset: PresetFilter) => {
    setFilters(presetToFilters(preset));
    setPage(1);
    setOpenPresetChipId(null);
  };

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

  const hasSavableFilters =
    filters.payee !== '' ||
    filters.type !== '' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-start">
      <aside className="order-1 w-full min-w-0 shrink-0 lg:order-0 lg:max-h-full lg:w-72 lg:overflow-x-hidden lg:overflow-y-auto xl:w-80">
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
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setSavePresetDialogOpen(true)}
              disabled={!hasSavableFilters}
            >
              Save filter
            </Button>
            {presetFilters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {presetFilters.map((preset) => (
                  <Popover
                    key={preset.id}
                    open={openPresetChipId === preset.id}
                    onOpenChange={(open) =>
                      setOpenPresetChipId(open ? preset.id : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="max-w-full cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            'max-w-full truncate border font-medium transition-colors',
                            presetChipColorClass(preset.id),
                          )}
                        >
                          {preset.name}
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-2" align="start">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          className="h-8 justify-start"
                          onClick={() => applyPresetFilter(preset)}
                        >
                          Apply
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-8 justify-start"
                          onClick={() => {
                            setOpenPresetChipId(null);
                            setEditingPreset(preset);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="order-2 min-w-0 flex-1 space-y-4 lg:order-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        {isLoading && !aggregate ? (
          <TransactionsSummaryCardsSkeleton
            showAvgDaily={Boolean(debouncedFilters.startDate)}
          />
        ) : aggregate ? (
          <TransactionsSummaryCards
            aggregate={aggregate}
            startDate={debouncedFilters.startDate || null}
            endDate={debouncedFilters.endDate || null}
            spentToday={spentToday}
          />
        ) : null}

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
                  <SelectTrigger id="pageSize" className="h-9 w-fit min-w-22">
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

      <TransactionCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <PresetFilterSaveDialog
        open={savePresetDialogOpen}
        onOpenChange={setSavePresetDialogOpen}
        filters={filters}
      />

      <PresetFilterEditDialog
        open={editingPreset !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPreset(null);
          }
        }}
        preset={editingPreset}
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
