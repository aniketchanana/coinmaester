'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TRANSACTION_NOTES_MAX_LENGTH } from '@repo/constant';
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
import { Label } from '@repo/ui/label';
import { Textarea } from '@repo/ui/textarea';

import { transactionKeys, updateTransaction } from '../lib/transactions';
import type {
  ListTransactionsResponse,
  TransactionRow,
} from '../types/transaction';

interface TransactionNotesDialogProps {
  transaction: TransactionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionNotesDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionNotesDialogProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!transaction) {
      return;
    }

    setNotes(transaction.notes ?? '');
  }, [transaction]);

  const remaining = TRANSACTION_NOTES_MAX_LENGTH - notes.length;
  const usagePercent = (notes.length / TRANSACTION_NOTES_MAX_LENGTH) * 100;
  const isOverLimit = notes.length > TRANSACTION_NOTES_MAX_LENGTH;
  const isNearLimit = remaining <= 50;

  const mutation = useMutation({
    mutationFn: () => {
      if (!transaction) {
        throw new Error('No transaction selected');
      }

      if (notes.length > TRANSACTION_NOTES_MAX_LENGTH) {
        throw new Error(
          `Notes must be at most ${TRANSACTION_NOTES_MAX_LENGTH} characters`,
        );
      }

      return updateTransaction(transaction.id, { notes });
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData<ListTransactionsResponse>(
        { queryKey: transactionKeys.all },
        (cached) => {
          if (!cached) {
            return cached;
          }

          return {
            ...cached,
            data: cached.data.map((row) =>
              row.id === updated.id
                ? {
                    ...row,
                    notes: updated.notes,
                    updatedAt: updated.updatedAt,
                  }
                : row,
            ),
          };
        },
      );
      toast.success('Notes saved');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save notes');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction notes</DialogTitle>
          <DialogDescription>
            Add personal reminders about this payment for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="transactionNotes">Notes</Label>
            <Textarea
              id="transactionNotes"
              value={notes}
              maxLength={TRANSACTION_NOTES_MAX_LENGTH}
              placeholder="e.g. Split with roommate, reimbursed in cash..."
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(event.target.value)
              }
            />
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    isNearLimit ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p
                className={`text-right text-xs ${
                  isNearLimit ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {remaining} characters remaining
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !transaction || isOverLimit}
          >
            {mutation.isPending ? 'Saving...' : 'Save notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
