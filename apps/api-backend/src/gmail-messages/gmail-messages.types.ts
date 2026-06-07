import type { JobStatus } from '@repo/constant';

export interface GmailMessageDto {
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
  data: GmailMessageDto[];
  pagination: GmailMessagesPagination;
}

export interface RetryGmailMessagesBody {
  ids: string[];
}

export interface RetryGmailMessagesResponse {
  requeued: string[];
  skipped: string[];
}
