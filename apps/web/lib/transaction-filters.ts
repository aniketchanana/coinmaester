import { TRANSACTION_FILTER_TYPE } from '@repo/constant';

import {
  TRANSACTION_SORT_FIELD,
  TRANSACTION_SORT_ORDER,
  type TransactionSortField,
  type TransactionSortOrder,
} from '../types/transaction';

export const TRANSACTION_FILTERS_STORAGE_KEY =
  'finance-app:transaction-filters';

export interface TransactionFiltersPreference {
  startDate: string;
  endDate: string;
  payee: string;
  type: string;
  sortBy: TransactionSortField;
  sortOrder: TransactionSortOrder;
}

const DEFAULT_FILTERS: TransactionFiltersPreference = {
  startDate: '',
  endDate: '',
  payee: '',
  type: '',
  sortBy: TRANSACTION_SORT_FIELD.TRANSACTION_DATE,
  sortOrder: TRANSACTION_SORT_ORDER.DESC,
};

const VALID_FILTER_TYPES = new Set<string>(
  Object.values(TRANSACTION_FILTER_TYPE),
);

function isTransactionSortField(value: string): value is TransactionSortField {
  return Object.values(TRANSACTION_SORT_FIELD).includes(
    value as TransactionSortField,
  );
}

function isTransactionSortOrder(
  value: string,
): value is TransactionSortOrder {
  return Object.values(TRANSACTION_SORT_ORDER).includes(
    value as TransactionSortOrder,
  );
}

export function readStoredTransactionFilters(): TransactionFiltersPreference {
  if (typeof window === 'undefined') {
    return DEFAULT_FILTERS;
  }

  try {
    const raw = localStorage.getItem(TRANSACTION_FILTERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FILTERS;
    }

    const parsed = JSON.parse(raw) as Partial<TransactionFiltersPreference>;

    return {
      startDate:
        typeof parsed.startDate === 'string' ? parsed.startDate : '',
      endDate: typeof parsed.endDate === 'string' ? parsed.endDate : '',
      payee: typeof parsed.payee === 'string' ? parsed.payee : '',
      type:
        typeof parsed.type === 'string' && VALID_FILTER_TYPES.has(parsed.type)
          ? parsed.type
          : '',
      sortBy:
        typeof parsed.sortBy === 'string' &&
        isTransactionSortField(parsed.sortBy)
          ? parsed.sortBy
          : DEFAULT_FILTERS.sortBy,
      sortOrder:
        typeof parsed.sortOrder === 'string' &&
        isTransactionSortOrder(parsed.sortOrder)
          ? parsed.sortOrder
          : DEFAULT_FILTERS.sortOrder,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function persistTransactionFilters(
  preference: TransactionFiltersPreference,
): void {
  try {
    localStorage.setItem(
      TRANSACTION_FILTERS_STORAGE_KEY,
      JSON.stringify(preference),
    );
  } catch {
    // Ignore storage failures.
  }
}
