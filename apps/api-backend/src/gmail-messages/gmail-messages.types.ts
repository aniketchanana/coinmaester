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

export interface GetEmailBodyResponse {
  gmailMessageId: string;
  from: string;
  subject: string;
  receivedAt: string;
  /** Raw stored body. Render it isolated — it is untrusted third-party markup. */
  body: string;
  isHtml: boolean;
}

export interface RetryGmailMessagesBody {
  ids: string[];
}

export interface RetryGmailMessagesResponse {
  requeued: string[];
  skipped: string[];
}
