import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

/**
 * Avg daily spend = totalDebit / (localToday − startDate) in calendar days.
 * Day count is at least 1.
 */
export function computeAvgDailySpend(
  totalDebit: number,
  startDate: string | undefined | null,
  today: Date = new Date(),
): number {
  if (!startDate?.trim()) {
    return totalDebit;
  }

  const start = startOfDay(parseISO(startDate.slice(0, 10)));
  if (Number.isNaN(start.getTime())) {
    return totalDebit;
  }

  const dayCount = Math.max(
    1,
    differenceInCalendarDays(startOfDay(today), start),
  );

  return totalDebit / dayCount;
}
