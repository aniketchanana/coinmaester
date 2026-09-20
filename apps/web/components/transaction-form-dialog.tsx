'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TRANSACTION_NOTES_MAX_LENGTH,
  TRANSACTION_TYPE,
  type TransactionType,
} from '@repo/constant';
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
import { cn } from '@repo/ui/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/select';
import { Textarea } from '@repo/ui/textarea';

import { AnimatedFormSection } from './animated-form-section';
import { SensitiveAmountInput } from './sensitive-amount-input';
import { SensitiveTextInput } from './sensitive-text-input';
import { TRANSACTION_TYPE_LABELS } from './transaction-type-badge';
import { analyticsKeys } from '../lib/analytics';
import {
  createTransaction,
  transactionKeys,
  updateTransaction,
} from '../lib/transactions';
import type { TransactionRow } from '../types/transaction';

interface TransactionFormValues {
  bankName: string;
  transactionValue: string;
  type: TransactionType;
  transactionDate: string;
  paymentMadeTo: string;
  notes: string;
  isInvestment: boolean;
}

const DIALOG_COPY = {
  create: {
    title: 'Add transaction',
    description: 'Record a transaction manually without email processing.',
    submit: 'Add transaction',
    submitting: 'Adding...',
    success: 'Transaction added',
    error: 'Failed to add transaction',
  },
  edit: {
    title: 'Edit transaction',
    description:
      'Update the extracted transaction details if the AI parsing was incorrect.',
    submit: 'Save changes',
    submitting: 'Saving...',
    success: 'Transaction updated',
    error: 'Failed to update transaction',
  },
} as const;

type TransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & (
  | { mode: 'create' }
  | {
      mode: 'edit';
      transaction: TransactionRow | null;
      onDelete?: (transaction: TransactionRow) => void;
    }
);

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function getCreateDefaults(): TransactionFormValues {
  return {
    bankName: 'Manual',
    transactionValue: '',
    type: TRANSACTION_TYPE.DEBIT,
    transactionDate: todayDateInputValue(),
    paymentMadeTo: '',
    notes: '',
    isInvestment: false,
  };
}

function getEditValues(transaction: TransactionRow): TransactionFormValues {
  return {
    bankName: transaction.bankName,
    transactionValue: String(transaction.transactionValue),
    type: transaction.type,
    transactionDate: toDateInputValue(transaction.transactionDate),
    paymentMadeTo: transaction.paymentMadeTo,
    notes: transaction.notes ?? '',
    isInvestment: transaction.isInvestment,
  };
}

function parseFormPayload(values: TransactionFormValues) {
  const parsedValue = Number(values.transactionValue);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw new Error('Amount must be a positive number');
  }

  if (!values.bankName.trim()) {
    throw new Error('Bank name is required');
  }

  if (!values.paymentMadeTo.trim()) {
    throw new Error('Payee is required');
  }

  if (!values.transactionDate) {
    throw new Error('Transaction date is required');
  }

  if (values.notes.length > TRANSACTION_NOTES_MAX_LENGTH) {
    throw new Error(
      `Notes must be at most ${TRANSACTION_NOTES_MAX_LENGTH} characters`,
    );
  }

  return {
    bankName: values.bankName.trim(),
    transactionValue: parsedValue,
    type: values.type,
    transactionDate: values.transactionDate,
    paymentMadeTo: values.paymentMadeTo.trim(),
    notes: values.notes,
    isInvestment: values.isInvestment,
  };
}

interface TransactionFormFieldsProps {
  idPrefix: string;
  values: TransactionFormValues;
  onChange: (patch: Partial<TransactionFormValues>) => void;
}

function TransactionFormFields({
  idPrefix,
  values,
  onChange,
}: TransactionFormFieldsProps) {
  const remainingNotes = TRANSACTION_NOTES_MAX_LENGTH - values.notes.length;
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid gap-4 py-2">
      <AnimatedFormSection index={0} className="grid gap-2">
        <Label htmlFor={fieldId('bankName')}>Bank</Label>
        <Input
          id={fieldId('bankName')}
          value={values.bankName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ bankName: event.target.value })
          }
        />
      </AnimatedFormSection>

      <AnimatedFormSection index={1} className="grid gap-2">
        <Label htmlFor={fieldId('transactionValue')}>Amount (INR)</Label>
        <SensitiveAmountInput
          id={fieldId('transactionValue')}
          step="0.01"
          min="0.01"
          value={values.transactionValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ transactionValue: event.target.value })
          }
        />
      </AnimatedFormSection>

      <AnimatedFormSection index={2} className="grid gap-2">
        <Label htmlFor={fieldId('type')}>Type</Label>
        <Select
          value={values.type}
          onValueChange={(value) => {
            if (
              value === TRANSACTION_TYPE.DEBIT ||
              value === TRANSACTION_TYPE.CREDIT
            ) {
              onChange({ type: value });
            }
          }}
        >
          <SelectTrigger id={fieldId('type')}>
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
        <Label htmlFor={fieldId('transactionDate')}>Transaction date</Label>
        <Input
          id={fieldId('transactionDate')}
          type="date"
          value={values.transactionDate}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ transactionDate: event.target.value })
          }
        />
      </AnimatedFormSection>

      <AnimatedFormSection index={4} className="grid gap-2">
        <Label htmlFor={fieldId('paymentMadeTo')}>Payee</Label>
        <SensitiveTextInput
          id={fieldId('paymentMadeTo')}
          placeholder="e.g. Grocery store, Rent, Salary"
          value={values.paymentMadeTo}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ paymentMadeTo: event.target.value })
          }
        />
      </AnimatedFormSection>

      <AnimatedFormSection index={5} className="grid gap-2">
        <Label htmlFor={fieldId('notes')}>Notes (optional)</Label>
        <Textarea
          id={fieldId('notes')}
          value={values.notes}
          maxLength={TRANSACTION_NOTES_MAX_LENGTH}
          placeholder="e.g. Split with roommate, reimbursed in cash..."
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ notes: event.target.value })
          }
        />
        <p
          className={cn(
            'text-right text-xs',
            remainingNotes <= 50
              ? 'text-destructive'
              : 'text-muted-foreground',
          )}
        >
          {remainingNotes} characters remaining
        </p>
      </AnimatedFormSection>

      <AnimatedFormSection index={6} className="flex items-center gap-2">
        <Checkbox
          id={fieldId('isInvestment')}
          checked={values.isInvestment}
          onCheckedChange={(checked) =>
            onChange({ isInvestment: checked === true })
          }
        />
        <Label htmlFor={fieldId('isInvestment')}>Mark as investment</Label>
      </AnimatedFormSection>
    </div>
  );
}

export function TransactionFormDialog(props: TransactionFormDialogProps) {
  const { open, onOpenChange, mode } = props;
  const transaction = mode === 'edit' ? props.transaction : null;
  const onDelete = mode === 'edit' ? props.onDelete : undefined;
  const copy = DIALOG_COPY[mode];
  const queryClient = useQueryClient();
  const [values, setValues] = React.useState<TransactionFormValues>(
    getCreateDefaults,
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'edit') {
      if (transaction) {
        setValues(getEditValues(transaction));
      }
      return;
    }

    setValues(getCreateDefaults());
  }, [open, mode, transaction]);

  const isNotesOverLimit = values.notes.length > TRANSACTION_NOTES_MAX_LENGTH;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = parseFormPayload(values);

      if (mode === 'edit') {
        if (!transaction) {
          throw new Error('No transaction selected');
        }

        return updateTransaction(transaction.id, payload);
      }

      return createTransaction({
        ...payload,
        notes: payload.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      toast.success(copy.success);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || copy.error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <TransactionFormFields
          idPrefix={mode}
          values={values}
          onChange={(patch) =>
            setValues((current) => ({ ...current, ...patch }))
          }
        />

        <DialogFooter
          className={cn(mode === 'edit' && 'gap-2 sm:justify-between')}
        >
          {mode === 'edit' ? (
            onDelete && transaction ? (
              <Button
                variant="destructive"
                onClick={() => onDelete(transaction)}
                disabled={mutation.isPending}
              >
                Delete
              </Button>
            ) : (
              <span />
            )
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={
                mutation.isPending ||
                isNotesOverLimit ||
                (mode === 'edit' && !transaction)
              }
            >
              {mutation.isPending ? copy.submitting : copy.submit}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
