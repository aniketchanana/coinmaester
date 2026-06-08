'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TRANSACTION_NOTES_MAX_LENGTH, TRANSACTION_TYPE } from '@repo/constant';
import { toast } from 'sonner';

import { Button } from '@repo/ui/button';
import { Checkbox } from '@repo/ui/checkbox';
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
import { Textarea } from '@repo/ui/textarea';

import { TRANSACTION_TYPE_LABELS } from './transaction-type-badge';
import { createTransaction, transactionKeys } from '../lib/transactions';

interface TransactionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionCreateDialog({
  open,
  onOpenChange,
}: TransactionCreateDialogProps) {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = React.useState('Manual');
  const [transactionValue, setTransactionValue] = React.useState('');
  const [type, setType] = React.useState<string>(TRANSACTION_TYPE.DEBIT);
  const [transactionDate, setTransactionDate] = React.useState(todayDateInputValue);
  const [paymentMadeTo, setPaymentMadeTo] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isInvestment, setIsInvestment] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setBankName('Manual');
    setTransactionValue('');
    setType(TRANSACTION_TYPE.DEBIT);
    setTransactionDate(todayDateInputValue());
    setPaymentMadeTo('');
    setNotes('');
    setIsInvestment(false);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      const parsedValue = Number(transactionValue);
      if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (!bankName.trim()) {
        throw new Error('Bank name is required');
      }

      if (!paymentMadeTo.trim()) {
        throw new Error('Payee is required');
      }

      if (!transactionDate) {
        throw new Error('Transaction date is required');
      }

      if (notes.length > TRANSACTION_NOTES_MAX_LENGTH) {
        throw new Error(
          `Notes must be at most ${TRANSACTION_NOTES_MAX_LENGTH} characters`,
        );
      }

      return createTransaction({
        bankName: bankName.trim(),
        transactionValue: parsedValue,
        type: type as typeof TRANSACTION_TYPE.DEBIT | typeof TRANSACTION_TYPE.CREDIT,
        transactionDate,
        paymentMadeTo: paymentMadeTo.trim(),
        notes: notes.trim() || undefined,
        isInvestment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      toast.success('Transaction added');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add transaction');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Record a transaction manually without email processing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="createBankName">Bank</Label>
            <Input
              id="createBankName"
              value={bankName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setBankName(event.target.value)
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="createTransactionValue">Amount (INR)</Label>
            <Input
              id="createTransactionValue"
              type="number"
              step="0.01"
              min="0.01"
              value={transactionValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setTransactionValue(event.target.value)
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="createType">Type</Label>
            <select
              id="createType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={type}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setType(event.target.value)
              }
            >
              <option value={TRANSACTION_TYPE.DEBIT}>
                {TRANSACTION_TYPE_LABELS[TRANSACTION_TYPE.DEBIT]}
              </option>
              <option value={TRANSACTION_TYPE.CREDIT}>
                {TRANSACTION_TYPE_LABELS[TRANSACTION_TYPE.CREDIT]}
              </option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="createTransactionDate">Transaction date</Label>
            <Input
              id="createTransactionDate"
              type="date"
              value={transactionDate}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setTransactionDate(event.target.value)
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="createPaymentMadeTo">Payee</Label>
            <Input
              id="createPaymentMadeTo"
              placeholder="e.g. Grocery store, Rent, Salary"
              value={paymentMadeTo}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPaymentMadeTo(event.target.value)
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="createNotes">Notes (optional)</Label>
            <Textarea
              id="createNotes"
              value={notes}
              maxLength={TRANSACTION_NOTES_MAX_LENGTH}
              placeholder="Optional details about this transaction"
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(event.target.value)
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="createIsInvestment"
              checked={isInvestment}
              onCheckedChange={(checked) =>
                setIsInvestment(checked === true)
              }
            />
            <Label htmlFor="createIsInvestment">Mark as investment</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Adding...' : 'Add transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
