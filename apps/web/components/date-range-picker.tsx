'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@repo/ui/button';
import { Calendar } from '@repo/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/popover';
import { cn } from '@repo/ui/lib/utils';

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
  id?: string;
}

function parseDate(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DateRangePicker({
  value,
  onChange,
  className,
  id,
}: DateRangePickerProps) {
  const selectedRange = React.useMemo(
    () => ({
      from: parseDate(value.startDate),
      to: parseDate(value.endDate),
    }),
    [value.endDate, value.startDate],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full min-w-0 justify-start gap-2 text-left font-normal',
            !value.startDate && !value.endDate && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {value.startDate && value.endDate ? (
              <>
                {format(parseDate(value.startDate)!, 'LLL dd, y')} –{' '}
                {format(parseDate(value.endDate)!, 'LLL dd, y')}
              </>
            ) : value.startDate ? (
              format(parseDate(value.startDate)!, 'LLL dd, y')
            ) : (
              'Pick a date range'
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={selectedRange?.from}
          selected={selectedRange}
          onSelect={(range) => {
            onChange({
              startDate: range?.from ? formatDateValue(range.from) : '',
              endDate: range?.to ? formatDateValue(range.to) : '',
            });
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
