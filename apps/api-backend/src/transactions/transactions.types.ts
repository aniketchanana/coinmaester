import type { TransactionType } from '@repo/constant';

export interface TransactionDto {
  id: string;
  bankName: string;
  transactionValue: number;
  type: TransactionType;
  transactionDate: string;
  paymentMadeTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionsAggregate {
  totalDebit: number;
  totalCredit: number;
}

export interface ListTransactionsResponse {
  data: TransactionDto[];
  pagination: TransactionsPagination;
  aggregate: TransactionsAggregate;
}

export interface UpdateTransactionBody {
  bankName?: string;
  transactionValue?: number;
  type?: TransactionType;
  transactionDate?: string;
  paymentMadeTo?: string;
}
