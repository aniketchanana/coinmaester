import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, DayFlag, SelectionState, UI } from 'react-day-picker';

import { cn } from '../../lib/utils';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        [UI.Months]: 'flex flex-col gap-4 sm:flex-row sm:gap-4',
        [UI.Month]: 'space-y-4',
        [UI.MonthCaption]: 'relative flex items-center justify-center pt-1',
        [UI.CaptionLabel]: 'text-sm font-medium',
        [UI.Nav]: 'flex items-center gap-1',
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        [UI.MonthGrid]: 'w-full border-collapse',
        [UI.Weekdays]: 'flex',
        [UI.Weekday]: 'w-9 font-normal text-[0.8rem] text-muted-foreground',
        [UI.Week]: 'mt-2 flex w-full',
        [UI.Day]:
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
        [UI.DayButton]: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),
        [DayFlag.outside]:
          'text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
        [DayFlag.disabled]: 'text-muted-foreground opacity-50',
        [DayFlag.today]: 'bg-accent text-accent-foreground',
        [SelectionState.selected]:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        [SelectionState.range_start]: 'rounded-l-md',
        [SelectionState.range_end]: 'rounded-r-md',
        [SelectionState.range_middle]:
          'rounded-none bg-accent text-accent-foreground',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className={cn('h-4 w-4', chevronClassName)} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
