import { apiGet, apiPost } from './api-client';
import type {
  GmailMessageStatusFilter,
  ListGmailMessagesResponse,
  RetryGmailMessagesResponse,
} from '../types/gmail-message';

export interface FetchGmailMessagesParams {
  page?: number;
  limit?: number;
  status?: GmailMessageStatusFilter;
}

export const gmailMessageKeys = {
  all: ['gmail-messages'] as const,
  list: (params: FetchGmailMessagesParams) =>
    ['gmail-messages', 'list', params] as const,
};

export function fetchGmailMessages(
  params: FetchGmailMessagesParams = {},
): Promise<ListGmailMessagesResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.status && params.status !== 'ALL') {
    searchParams.set('status', params.status);
  }

  const query = searchParams.toString();
  const url = query ? `/gmail-messages?${query}` : '/gmail-messages';

  return apiGet<ListGmailMessagesResponse>(url);
}

export function retryGmailMessages(
  ids: string[],
): Promise<RetryGmailMessagesResponse> {
  return apiPost<RetryGmailMessagesResponse>('/gmail-messages/retry', {
    ids,
  }).then((response) => response.data);
}
