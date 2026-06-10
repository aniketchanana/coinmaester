'use client';

import * as React from 'react';

import {
  applyThemeStyle,
  DEFAULT_THEME_STYLE,
  persistThemeStyle,
  readStoredThemeStyle,
  type ThemeStyle,
} from '../lib/theme-styles';

type ThemeStyleContextValue = {
  style: ThemeStyle;
  setStyle: (style: ThemeStyle) => void;
};

const ThemeStyleContext = React.createContext<ThemeStyleContextValue | null>(
  null,
);

export function ThemeStyleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [style, setStyleState] = React.useState<ThemeStyle>(DEFAULT_THEME_STYLE);

  React.useEffect(() => {
    // DOM attribute is already applied by the inline init script in layout.
    setStyleState(readStoredThemeStyle());
  }, []);

  const setStyle = React.useCallback((next: ThemeStyle) => {
    setStyleState(next);
    applyThemeStyle(next);
    persistThemeStyle(next);
  }, []);

  const value = React.useMemo(
    () => ({
      style,
      setStyle,
    }),
    [style, setStyle],
  );

  return (
    <ThemeStyleContext.Provider value={value}>
      {children}
    </ThemeStyleContext.Provider>
  );
}

export function useThemeStyle() {
  const context = React.useContext(ThemeStyleContext);

  if (!context) {
    throw new Error('useThemeStyle must be used within ThemeStyleProvider');
  }

  return context;
}
