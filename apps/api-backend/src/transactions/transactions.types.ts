import type { CurrencyType, TransactionType } from '@repo/constant';

export interface TransactionDto {
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

export interface TransactionsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionsAggregate {
  totalDebit: number;
  totalCredit: number;
  totalInvestment: number;
}

export interface ListTransactionsResponse {
  data: TransactionDto[];
  pagination: TransactionsPagination;
  aggregate: TransactionsAggregate;
  currencyType: CurrencyType;
}

export interface CreateTransactionBody {
  bankName: string;
  transactionValue: number;
  type: TransactionType;
  transactionDate: string;
  paymentMadeTo: string;
  notes?: string;
  isInvestment?: boolean;
}

export interface UpdateTransactionBody {
  bankName?: string;
  transactionValue?: number;
  type?: TransactionType;
  transactionDate?: string;
  paymentMadeTo?: string;
  notes?: string;
  isInvestment?: boolean;
}
