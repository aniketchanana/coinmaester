'use client';

import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';

import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Checkbox } from '@repo/ui/checkbox';
import { cn } from '@repo/ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/popover';

import { presetColorAt } from '../lib/analytics-chart-colors';
import type { PresetFilter } from '../lib/preset-filters';

interface AnalyticsPresetBarProps {
  presets: PresetFilter[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onCreateClick: () => void;
}

export function AnalyticsPresetBar({
  presets,
  selectedIds,
  onSelectedIdsChange,
  onCreateClick,
}: AnalyticsPresetBarProps) {
  const selectedSet = new Set(selectedIds);
  const selectedPresets = presets.filter((preset) => selectedSet.has(preset.id));
  const isLastSelected = selectedIds.length <= 1;

  const togglePreset = (id: string) => {
    if (selectedSet.has(id)) {
      if (isLastSelected) {
        return;
      }
      onSelectedIdsChange(selectedIds.filter((value) => value !== id));
      return;
    }

    onSelectedIdsChange([...selectedIds, id]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Presets</h2>
          <p className="text-sm text-muted-foreground">
            Select one preset for a focused view, or multiple to compare. At
            least one preset must stay selected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Select filters
                  <ChevronsUpDown className="size-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <div className="mb-2 px-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Multi-select presets
                  </p>
                </div>
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {presets.map((preset, index) => {
                    const checked = selectedSet.has(preset.id);
                    const lockedChecked = checked && isLastSelected;

                    return (
                      <li key={preset.id}>
                        <label
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                            lockedChecked
                              ? 'cursor-not-allowed opacity-70'
                              : 'cursor-pointer hover:bg-muted/70',
                            checked && 'bg-muted/50',
                          )}
                          title={
                            lockedChecked
                              ? 'At least one preset must remain selected'
                              : undefined
                          }
                        >
                          <Checkbox
                            checked={checked}
                            disabled={lockedChecked}
                            onCheckedChange={() => {
                              if (!lockedChecked) {
                                togglePreset(preset.id);
                              }
                            }}
                            aria-label={
                              lockedChecked
                                ? `${preset.name} (required — cannot deselect)`
                                : `Select ${preset.name}`
                            }
                          />
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: presetColorAt(index) }}
                          />
                          <span className="truncate font-medium">
                            {preset.name}
                          </span>
                          {checked ? (
                            <Check className="ml-auto size-3.5 text-primary" />
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </PopoverContent>
            </Popover>
          ) : null}
          <Button size="sm" className="gap-1.5" onClick={onCreateClick}>
            <Plus className="size-3.5" />
            Create preset
          </Button>
        </div>
      </div>

      {selectedPresets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedPresets.map((preset) => {
            const colorIndex = presets.findIndex(
              (item) => item.id === preset.id,
            );
            const canRemove = !isLastSelected;

            return (
              <Badge
                key={preset.id}
                variant="secondary"
                className="gap-1.5 border px-2.5 py-1 text-xs"
                style={{
                  borderColor: presetColorAt(colorIndex >= 0 ? colorIndex : 0),
                }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: presetColorAt(
                      colorIndex >= 0 ? colorIndex : 0,
                    ),
                  }}
                />
                {preset.name}
                <button
                  type="button"
                  disabled={!canRemove}
                  className={cn(
                    'ml-0.5 rounded-sm transition-opacity',
                    canRemove
                      ? 'opacity-70 hover:opacity-100'
                      : 'cursor-not-allowed opacity-30',
                  )}
                  aria-label={
                    canRemove
                      ? `Remove ${preset.name}`
                      : `Cannot remove ${preset.name} — at least one preset is required`
                  }
                  title={
                    canRemove
                      ? `Remove ${preset.name}`
                      : 'At least one preset must remain selected'
                  }
                  onClick={() => {
                    if (canRemove) {
                      togglePreset(preset.id);
                    }
                  }}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
