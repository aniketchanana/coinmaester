'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';

import { formatTransactionAmount } from '../lib/currency';
import {
  deleteTransaction,
  fetchTransactions,
  transactionKeys,
} from '../lib/transactions';
import type { TransactionRow } from '../types/transaction';
import { TransactionEditDialog } from './transaction-edit-dialog';

const PAGE_SIZE = 10;

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
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [appliedFilters, setAppliedFilters] = React.useState({
    startDate: '',
    endDate: '',
  });
  const [editingTransaction, setEditingTransaction] =
    React.useState<TransactionRow | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    React.useState<TransactionRow | null>(null);

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

  const queryParams = React.useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
    }),
    [page, appliedFilters],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: transactionKeys.list(queryParams),
    queryFn: () => fetchTransactions(queryParams),
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const aggregate = data?.aggregate;

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ startDate, endDate });
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setAppliedFilters({ startDate: '', endDate: '' });
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="startDate">From</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setStartDate(event.target.value)
            }
          />
        </div>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="endDate">To</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setEndDate(event.target.value)
            }
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters}>
            Clear
          </Button>
          <Button onClick={applyFilters}>Apply</Button>
        </div>
      </div>

      {aggregate ? (
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Bank</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Payee</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
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
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.bankName}</TableCell>
                <TableCell>
                  {formatTransactionAmount(row.transactionValue)}
                </TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(row.transactionDate)}
                </TableCell>
                <TableCell>{row.paymentMadeTo}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
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
