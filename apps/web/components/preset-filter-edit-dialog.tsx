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
  deletePresetFilter,
  filtersToPresetPayload,
  presetFilterKeys,
  type PresetFilter,
  updatePresetFilter,
} from '../lib/preset-filters';
import { DateRangePicker } from './date-range-picker';

const TYPE_FILTER_ALL = 'ALL';

interface PresetFilterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PresetFilter | null;
}

export function PresetFilterEditDialog({
  open,
  onOpenChange,
  preset,
}: PresetFilterEditDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [payee, setPayee] = React.useState('');
  const [type, setType] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open || !preset) {
      setConfirmDelete(false);
      return;
    }

    setName(preset.name);
    setPayee(preset.payee ?? '');
    setType(preset.type ?? '');
    setStartDate(preset.dateRange?.startDate ?? '');
    setEndDate(preset.dateRange?.endDate ?? '');
    setConfirmDelete(false);
  }, [open, preset]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!preset) {
        throw new Error('No preset selected');
      }

      return updatePresetFilter(preset.id, {
        name,
        ...filtersToPresetPayload({ payee, type, startDate, endDate }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: presetFilterKeys.all });
      toast.success('Filter updated');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update filter');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!preset) {
        throw new Error('No preset selected');
      }

      return deletePresetFilter(preset.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: presetFilterKeys.all });
      toast.success('Filter deleted');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete filter');
    },
  });

  const isPending = saveMutation.isPending || deleteMutation.isPending;
  const hasFilterFacet =
    payee.trim() !== '' || type !== '' || startDate !== '' || endDate !== '';
  const canSave = name.trim().length > 0 && hasFilterFacet && !isPending;

  if (!preset) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit filter</DialogTitle>
          <DialogDescription>
            Rename this filter, change its values, or delete it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-preset-name">Name</Label>
            <Input
              id="edit-preset-name"
              value={name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setName(event.target.value)
              }
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-preset-payee">Payee</Label>
            <Input
              id="edit-preset-payee"
              placeholder="Search by payee"
              value={payee}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPayee(event.target.value)
              }
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-preset-type">Type</Label>
            <Select
              value={type || TYPE_FILTER_ALL}
              onValueChange={(value) =>
                setType(value === TYPE_FILTER_ALL ? '' : value)
              }
              disabled={isPending}
            >
              <SelectTrigger id="edit-preset-type">
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
            <Label htmlFor="edit-preset-date-range">Date range</Label>
            <DateRangePicker
              id="edit-preset-date-range"
              value={{ startDate, endDate }}
              onChange={(dateRange) => {
                setStartDate(dateRange.startDate);
                setEndDate(dateRange.endDate);
              }}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {confirmDelete ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={isPending}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isPending}
                >
                  Cancel delete
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
