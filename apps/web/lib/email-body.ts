import { apiClient } from './api-client';
import type { EmailBody } from '../types/email-body';

export const emailBodyKeys = {
  all: ['email-body'] as const,
  detail: (gmailMessageId: string) =>
    ['email-body', 'detail', gmailMessageId] as const,
};

function readEncodedHeader(
  headers: Record<string, unknown>,
  name: string,
): string {
  const raw = headers[name];
  if (typeof raw !== 'string' || raw.length === 0) {
    return '';
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function fetchEmailBody(
  gmailMessageId: string,
): Promise<EmailBody> {
  const response = await apiClient.get<string>(
    `/get-email-body/${encodeURIComponent(gmailMessageId)}`,
    {
      responseType: 'text',
      headers: { Accept: 'text/html' },
    },
  );

  return {
    html: response.data,
    from: readEncodedHeader(response.headers, 'x-email-from'),
    subject: readEncodedHeader(response.headers, 'x-email-subject'),
    receivedAt: readEncodedHeader(response.headers, 'x-email-received-at'),
  };
}
