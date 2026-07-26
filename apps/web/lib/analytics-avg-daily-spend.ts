import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

/**
 * Avg daily spend = totalDebit / days in the filter range.
 * totalDays = max(1, endDate − startDate + 1) inclusive calendar days.
 * When start and end date is missing, return null.
 */
export function computeAvgDailySpend(
  totalDebit: number,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): number | null {
  if (!startDate?.trim() || !endDate?.trim()) {
    return null;
  }

  const start = startOfDay(parseISO(startDate.slice(0, 10)));
  if (Number.isNaN(start.getTime())) {
    return totalDebit;
  }

  const end = startOfDay(parseISO(endDate.slice(0, 10)));
  if (Number.isNaN(end.getTime())) {
    return totalDebit;
  }

  const dayCount = Math.max(1, differenceInCalendarDays(end, start) + 1);

  return totalDebit / dayCount;
}
