'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  createPresetFilter,
  filtersToPresetPayload,
  presetFilterKeys,
} from '../lib/preset-filters';

interface PresetFilterSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    payee: string;
    type: string;
    startDate: string;
    endDate: string;
  };
}

export function PresetFilterSaveDialog({
  open,
  onOpenChange,
  filters,
}: PresetFilterSaveDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setName('');
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      createPresetFilter({
        name,
        ...filtersToPresetPayload(filters),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: presetFilterKeys.all });
      toast.success('Filter saved');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save filter');
    },
  });

  const canSubmit = name.trim().length > 0 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save filter</DialogTitle>
          <DialogDescription>
            Give this filter a name so you can apply it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="preset-filter-name">Name</Label>
          <Input
            id="preset-filter-name"
            placeholder="e.g. June Amazon debits"
            value={name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setName(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canSubmit) {
                event.preventDefault();
                mutation.mutate();
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
