'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TRANSACTION_TYPE } from '@repo/constant';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/select';

import { AnimatedFormSection } from './animated-form-section';
import { SensitiveAmountInput } from './sensitive-amount-input';
import { SensitiveTextInput } from './sensitive-text-input';
import { TRANSACTION_TYPE_LABELS } from './transaction-type-badge';
import { analyticsKeys } from '../lib/analytics';
import { transactionKeys, updateTransaction } from '../lib/transactions';
import type { TransactionRow } from '../types/transaction';

interface TransactionEditDialogProps {
  transaction: TransactionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (transaction: TransactionRow) => void;
}

function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function TransactionEditDialog({
  transaction,
  open,
  onOpenChange,
  onDelete,
}: TransactionEditDialogProps) {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = React.useState('');
  const [transactionValue, setTransactionValue] = React.useState('');
  const [type, setType] = React.useState<string>(TRANSACTION_TYPE.DEBIT);
  const [transactionDate, setTransactionDate] = React.useState('');
  const [paymentMadeTo, setPaymentMadeTo] = React.useState('');
  const [isInvestment, setIsInvestment] = React.useState(false);

  React.useEffect(() => {
    if (!transaction) {
      return;
    }

    setBankName(transaction.bankName);
    setTransactionValue(String(transaction.transactionValue));
    setType(transaction.type);
    setTransactionDate(toDateInputValue(transaction.transactionDate));
    setPaymentMadeTo(transaction.paymentMadeTo);
    setIsInvestment(transaction.isInvestment);
  }, [transaction]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!transaction) {
        throw new Error('No transaction selected');
      }

      const parsedValue = Number(transactionValue);
      if (Number.isNaN(parsedValue)) {
        throw new Error('Amount must be a valid number');
      }

      return updateTransaction(transaction.id, {
        bankName,
        transactionValue: parsedValue,
        type: type as
          | typeof TRANSACTION_TYPE.DEBIT
          | typeof TRANSACTION_TYPE.CREDIT,
        transactionDate,
        paymentMadeTo,
        isInvestment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      toast.success('Transaction updated');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update transaction');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            Update the extracted transaction details if the AI parsing was
            incorrect.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <AnimatedFormSection index={0} className="grid gap-2">
            <Label htmlFor="bankName">Bank</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setBankName(event.target.value)
              }
            />
          </AnimatedFormSection>

          <AnimatedFormSection index={1} className="grid gap-2">
            <Label htmlFor="transactionValue">Amount (INR)</Label>
            <SensitiveAmountInput
              id="transactionValue"
              step="0.01"
              value={transactionValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setTransactionValue(event.target.value)
              }
            />
          </AnimatedFormSection>

          <AnimatedFormSection index={2} className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TRANSACTION_TYPE.DEBIT}>
                  {TRANSACTION_TYPE_LABELS[TRANSACTION_TYPE.DEBIT]}
                </SelectItem>
                <SelectItem value={TRANSACTION_TYPE.CREDIT}>
                  {TRANSACTION_TYPE_LABELS[TRANSACTION_TYPE.CREDIT]}
                </SelectItem>
              </SelectContent>
            </Select>
          </AnimatedFormSection>

          <AnimatedFormSection index={3} className="grid gap-2">
            <Label htmlFor="transactionDate">Transaction date</Label>
            <Input
              id="transactionDate"
              type="date"
              value={transactionDate}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setTransactionDate(event.target.value)
              }
            />
          </AnimatedFormSection>

          <AnimatedFormSection index={4} className="grid gap-2">
            <Label htmlFor="paymentMadeTo">Payee</Label>
            <SensitiveTextInput
              id="paymentMadeTo"
              value={paymentMadeTo}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPaymentMadeTo(event.target.value)
              }
            />
          </AnimatedFormSection>

          <AnimatedFormSection index={5} className="flex items-center gap-2">
            <Checkbox
              id="isInvestment"
              checked={isInvestment}
              onCheckedChange={(checked) => setIsInvestment(checked === true)}
            />
            <Label htmlFor="isInvestment">Mark as investment</Label>
          </AnimatedFormSection>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete && transaction ? (
            <Button
              variant="destructive"
              onClick={() => onDelete(transaction)}
              disabled={mutation.isPending}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !transaction}
            >
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
