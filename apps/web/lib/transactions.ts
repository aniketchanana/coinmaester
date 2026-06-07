import { apiDelete, apiGet, apiPatch } from './api-client';
import type {
  ListTransactionsResponse,
  TransactionRow,
  UpdateTransactionPayload,
} from '../types/transaction';

export interface FetchTransactionsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (params: FetchTransactionsParams) =>
    ['transactions', 'list', params] as const,
};

export function fetchTransactions(
  params: FetchTransactionsParams = {},
): Promise<ListTransactionsResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }

  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }

  const query = searchParams.toString();
  const url = query ? `/transactions?${query}` : '/transactions';

  return apiGet<ListTransactionsResponse>(url);
}

export function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload,
): Promise<TransactionRow> {
  return apiPatch<TransactionRow>(`/transactions/${id}`, payload);
}

export function deleteTransaction(id: string): Promise<void> {
  return apiDelete(`/transactions/${id}`);
}
