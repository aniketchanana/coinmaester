import type { TransactionFilterType } from '@repo/constant';

import { apiDelete, apiGet, apiPatch, apiPost } from './api-client';
import type {
  CreateTransactionPayload,
  ListTransactionsResponse,
  TransactionRow,
  TransactionSortField,
  TransactionSortOrder,
  UpdateTransactionPayload,
} from '../types/transaction';

export interface FetchTransactionsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  payee?: string;
  type?: TransactionFilterType;
  sortBy?: TransactionSortField;
  sortOrder?: TransactionSortOrder;
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

  if (params.payee) {
    searchParams.set('payee', params.payee);
  }

  if (params.type) {
    searchParams.set('type', params.type);
  }

  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }

  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder);
  }

  const query = searchParams.toString();
  const url = query ? `/transactions?${query}` : '/transactions';

  return apiGet<ListTransactionsResponse>(url);
}

export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<TransactionRow> {
  const response = await apiPost<TransactionRow>('/transactions', payload);
  return response.data;
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
