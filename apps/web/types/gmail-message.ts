import type { JobStatus } from '@repo/constant';

export interface GmailMessageRow {
  id: string;
  status: JobStatus;
  internalDate: string;
  updatedAt: string;
  from: string;
  subject: string;
  hasTransaction: boolean;
}

export interface GmailMessagesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListGmailMessagesResponse {
  data: GmailMessageRow[];
  pagination: GmailMessagesPagination;
}

export interface RetryGmailMessagesResponse {
  requeued: string[];
  skipped: string[];
}

export type GmailMessageStatusFilter = JobStatus | 'ALL';
