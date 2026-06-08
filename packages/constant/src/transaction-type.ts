export const TRANSACTION_TYPE = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const TRANSACTION_FILTER_TYPE = {
  ...TRANSACTION_TYPE,
  INVESTMENT: 'INVESTMENT',
} as const;

export type TransactionFilterType =
  (typeof TRANSACTION_FILTER_TYPE)[keyof typeof TRANSACTION_FILTER_TYPE];
