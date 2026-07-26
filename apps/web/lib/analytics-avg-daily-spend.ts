import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

/**
 * Avg daily spend = totalDebit / days in the filter range.
 * totalDays = max(1, endDate − startDate + 1) inclusive calendar days.
 * When endDate is missing, startDate is used (single-day range).
 */
export function computeAvgDailySpend(
  totalDebit: number,
  startDate: string | undefined | null,
  endDate?: string | undefined | null,
): number {
  if (!startDate?.trim()) {
    return totalDebit;
  }

  const start = startOfDay(parseISO(startDate.slice(0, 10)));
  if (Number.isNaN(start.getTime())) {
    return totalDebit;
  }

  const endSource = endDate?.trim() ? endDate : startDate;
  const end = startOfDay(parseISO(endSource.slice(0, 10)));
  if (Number.isNaN(end.getTime())) {
    return totalDebit;
  }

  const dayCount = Math.max(1, differenceInCalendarDays(end, start) + 1);

  return totalDebit / dayCount;
}
