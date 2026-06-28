'use client';

import * as React from 'react';

import { persistIncognito, readStoredIncognito } from '../lib/incognito';

interface IncognitoContextValue {
  isIncognito: boolean;
  toggleIncognito: () => void;
  setIncognito: (enabled: boolean) => void;
}

const IncognitoContext = React.createContext<IncognitoContextValue | null>(
  null,
);

export function IncognitoProvider({ children }: { children: React.ReactNode }) {
  const [isIncognito, setIsIncognito] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsIncognito(readStoredIncognito());
    setIsHydrated(true);
  }, []);

  const setIncognito = React.useCallback((enabled: boolean) => {
    setIsIncognito(enabled);
    persistIncognito(enabled);
  }, []);

  const toggleIncognito = React.useCallback(() => {
    setIsIncognito((current) => {
      const next = !current;
      persistIncognito(next);
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      isIncognito: isHydrated ? isIncognito : false,
      toggleIncognito,
      setIncognito,
    }),
    [isHydrated, isIncognito, setIncognito, toggleIncognito],
  );

  return (
    <IncognitoContext.Provider value={value}>
      {children}
    </IncognitoContext.Provider>
  );
}

export function useIncognito(): IncognitoContextValue {
  const context = React.useContext(IncognitoContext);

  if (!context) {
    throw new Error('useIncognito must be used within IncognitoProvider');
  }

  return context;
}
