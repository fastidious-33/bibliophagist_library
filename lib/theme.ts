/**
 * Browser-chrome colour per theme (mobile address bar, task switcher).
 * Mirrors --paper in app/globals.css — keep the two in sync.
 */
export const THEME_COLORS = {
  light: '#f3ecdf',
  dark: '#1f1813',
} as const;

export function applyThemeColor(theme: 'light' | 'dark') {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme]);
}
