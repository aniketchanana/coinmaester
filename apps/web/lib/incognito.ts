export const INCOGNITO_STORAGE_KEY = 'coinmaester:incognito-enabled';

export const MASKED_PAYEE_LABEL = '••••••••';

export const INCOGNITO_TRANSACTION_TYPE_LABEL = 'Transaction';

export function maskSensitiveText(value: string, hidden: boolean): string {
  if (!hidden || value.trim() === '') {
    return value;
  }

  return MASKED_PAYEE_LABEL;
}

export function readStoredIncognito(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(INCOGNITO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistIncognito(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(INCOGNITO_STORAGE_KEY, 'true');
      return;
    }

    localStorage.removeItem(INCOGNITO_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
