'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_CURRENCY, type CurrencyType } from '@repo/constant';
import * as React from 'react';
import { toast } from 'sonner';

import { analyticsKeys } from '../lib/analytics';
import {
  fetchPreferences,
  preferenceKeys,
  updatePreferences,
} from '../lib/preferences';
import { transactionKeys } from '../lib/transactions';

interface CurrencyContextValue {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  isLoading: boolean;
}

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: preferenceKeys.detail(),
    queryFn: fetchPreferences,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: (response) => {
      queryClient.setQueryData(preferenceKeys.detail(), response);
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update currency preference');
    },
  });

  const currency = data?.currencyType ?? DEFAULT_CURRENCY;

  const setCurrency = React.useCallback(
    (next: CurrencyType) => {
      if (
        next.name === currency.name &&
        next.symbol === currency.symbol
      ) {
        return;
      }

      mutation.mutate(next);
    },
    [currency.name, currency.symbol, mutation],
  );

  const value = React.useMemo(
    () => ({
      currency,
      setCurrency,
      isLoading,
    }),
    [currency, isLoading, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = React.useContext(CurrencyContext);

  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  return context;
}
