'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TRANSACTION_FILTER_TYPE } from '@repo/constant';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/select';

import {
  createPresetFilter,
  filtersToPresetPayload,
  presetFilterKeys,
} from '../lib/preset-filters';
import { DateRangePicker } from './date-range-picker';

const TYPE_FILTER_ALL = 'ALL';

interface PresetFilterCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (presetId: string) => void;
}

export function PresetFilterCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: PresetFilterCreateDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [payee, setPayee] = React.useState('');
  const [type, setType] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setName('');
      setPayee('');
      setType('');
      setStartDate('');
      setEndDate('');
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      createPresetFilter({
        name,
        ...filtersToPresetPayload({ payee, type, startDate, endDate }),
      }),
    onSuccess: (preset) => {
      void queryClient.invalidateQueries({ queryKey: presetFilterKeys.all });
      toast.success('Filter created');
      onCreated?.(preset.id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create filter');
    },
  });

  const hasFilterFacet =
    payee.trim() !== '' || type !== '' || startDate !== '' || endDate !== '';
  const canSubmit = name.trim().length > 0 && hasFilterFacet && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create preset filter</DialogTitle>
          <DialogDescription>
            Save a named filter to scope analytics by payee, type, or date range.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="create-preset-name">Name</Label>
            <Input
              id="create-preset-name"
              placeholder="e.g. June spending"
              value={name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setName(event.target.value)
              }
              disabled={mutation.isPending}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-preset-payee">Payee</Label>
            <Input
              id="create-preset-payee"
              placeholder="Search by payee"
              value={payee}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPayee(event.target.value)
              }
              disabled={mutation.isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-preset-type">Type</Label>
            <Select
              value={type || TYPE_FILTER_ALL}
              onValueChange={(value) =>
                setType(value === TYPE_FILTER_ALL ? '' : value)
              }
              disabled={mutation.isPending}
            >
              <SelectTrigger id="create-preset-type">
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
            <Label htmlFor="create-preset-date-range">Date range</Label>
            <DateRangePicker
              id="create-preset-date-range"
              value={{ startDate, endDate }}
              onChange={(dateRange) => {
                setStartDate(dateRange.startDate);
                setEndDate(dateRange.endDate);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
