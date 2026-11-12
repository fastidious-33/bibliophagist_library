/**
 * Browser-chrome colour per theme (mobile address bar, task switcher).
 * Mirrors --paper in app/globals.css — keep the two in sync.
 */
export const THEME_COLORS = {
  light: '#f2e8d5',
  dark: '#1a2118',
} as const;

export function applyThemeColor(theme: 'light' | 'dark') {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme]);
}
