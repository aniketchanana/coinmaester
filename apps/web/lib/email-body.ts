import { apiGet } from './api-client';
import type { EmailBody } from '../types/email-body';

export const emailBodyKeys = {
  all: ['email-body'] as const,
  detail: (gmailMessageId: string) =>
    ['email-body', 'detail', gmailMessageId] as const,
};

export function fetchEmailBody(gmailMessageId: string): Promise<EmailBody> {
  return apiGet<EmailBody>(
    `/get-email-body/${encodeURIComponent(gmailMessageId)}`,
  );
}
