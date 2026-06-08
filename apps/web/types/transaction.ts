import type { TransactionType } from '@repo/constant';

export const TRANSACTION_SORT_FIELD = {
  TRANSACTION_DATE: 'transactionDate',
  TRANSACTION_VALUE: 'transactionValue',
} as const;

export type TransactionSortField =
  (typeof TRANSACTION_SORT_FIELD)[keyof typeof TRANSACTION_SORT_FIELD];

export const TRANSACTION_SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type TransactionSortOrder =
  (typeof TRANSACTION_SORT_ORDER)[keyof typeof TRANSACTION_SORT_ORDER];

export interface TransactionRow {
  id: string;
  bankName: string;
  transactionValue: number;
  type: TransactionType;
  transactionDate: string;
  paymentMadeTo: string;
  notes: string | null;
  isInvestment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsAggregate {
  totalDebit: number;
  totalCredit: number;
  totalInvestment: number;
}

export interface TransactionsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListTransactionsResponse {
  data: TransactionRow[];
  pagination: TransactionsPagination;
  aggregate: TransactionsAggregate;
}

export interface CreateTransactionPayload {
  bankName: string;
  transactionValue: number;
  type: TransactionType;
  transactionDate: string;
  paymentMadeTo: string;
  notes?: string;
  isInvestment?: boolean;
}

export interface UpdateTransactionPayload {
  bankName?: string;
  transactionValue?: number;
  type?: TransactionType;
  transactionDate?: string;
  paymentMadeTo?: string;
  notes?: string;
  isInvestment?: boolean;
}
