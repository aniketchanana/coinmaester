export const TRANSACTION_TYPE = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];
