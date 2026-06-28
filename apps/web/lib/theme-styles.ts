export const THEME_STYLE_STORAGE_KEY = 'theme-style';

export const DEFAULT_THEME_STYLE = 'default' as const;

export const THEME_STYLE_IDS = [
  'default',
  'neumorphic',
  'glass',
  'brutalist',
] as const;

export type ThemeStyle = (typeof THEME_STYLE_IDS)[number];

export function isThemeStyle(
  value: string | null | undefined,
): value is ThemeStyle {
  return THEME_STYLE_IDS.includes(value as ThemeStyle);
}

export function readStoredThemeStyle(): ThemeStyle {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_STYLE;
  }

  try {
    const stored = localStorage.getItem(THEME_STYLE_STORAGE_KEY);
    return isThemeStyle(stored) ? stored : DEFAULT_THEME_STYLE;
  } catch {
    return DEFAULT_THEME_STYLE;
  }
}

export function applyThemeStyle(style: ThemeStyle) {
  const root = document.documentElement;

  if (style === DEFAULT_THEME_STYLE) {
    root.removeAttribute('data-style');
    return;
  }

  root.setAttribute('data-style', style);
}

export function persistThemeStyle(style: ThemeStyle) {
  try {
    localStorage.setItem(THEME_STYLE_STORAGE_KEY, style);
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }
}

export const THEME_STYLE_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STYLE_STORAGE_KEY}');var valid=${JSON.stringify(THEME_STYLE_IDS)};if(s&&valid.indexOf(s)!==-1&&s!=='${DEFAULT_THEME_STYLE}'){document.documentElement.setAttribute('data-style',s);}}catch(e){}})();`;
