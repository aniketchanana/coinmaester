'use client';

import { useTheme } from 'next-themes';
import * as React from 'react';

const COLOR_MODE_STORAGE_KEY = 'theme';

/**
 * next-themes can hydrate with an undefined theme after SSR even when
 * localStorage has a value. After a full reload (e.g. OAuth), React may also
 * drop the class the inline script applied. Re-sync from storage before paint.
 */
export function ThemeColorSync() {
  const { setTheme } = useTheme();

  React.useLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
      if (stored) {
        setTheme(stored);
      }
    } catch {
      // Ignore storage failures (private browsing, quota, etc.)
    }
  }, [setTheme]);

  return null;
}
