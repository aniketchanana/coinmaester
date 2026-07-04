import { JOB_STATUS } from '@repo/constant/job-status';

import type { GmailMessageStatusFilter } from '../types/gmail-message';

export const EMAIL_SYNC_FILTERS_STORAGE_KEY = 'finance-app:email-sync-filters';

const DEFAULT_STATUS_FILTER: GmailMessageStatusFilter = 'ALL';

const VALID_STATUS_FILTERS = new Set<GmailMessageStatusFilter>([
  'ALL',
  JOB_STATUS.PENDING,
  JOB_STATUS.IN_PROGRESS,
  JOB_STATUS.COMPLETED,
  JOB_STATUS.FAILED,
]);

function isGmailMessageStatusFilter(
  value: string,
): value is GmailMessageStatusFilter {
  return VALID_STATUS_FILTERS.has(value as GmailMessageStatusFilter);
}

export function readStoredEmailSyncStatusFilter(): GmailMessageStatusFilter {
  if (typeof window === 'undefined') {
    return DEFAULT_STATUS_FILTER;
  }

  try {
    const raw = localStorage.getItem(EMAIL_SYNC_FILTERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATUS_FILTER;
    }

    const parsed = JSON.parse(raw) as { status?: string };
    if (
      typeof parsed.status === 'string' &&
      isGmailMessageStatusFilter(parsed.status)
    ) {
      return parsed.status;
    }
  } catch {
    // Ignore invalid stored preferences.
  }

  return DEFAULT_STATUS_FILTER;
}

export function persistEmailSyncStatusFilter(
  status: GmailMessageStatusFilter,
): void {
  try {
    localStorage.setItem(
      EMAIL_SYNC_FILTERS_STORAGE_KEY,
      JSON.stringify({ status }),
    );
  } catch {
    // Ignore storage failures.
  }
}
