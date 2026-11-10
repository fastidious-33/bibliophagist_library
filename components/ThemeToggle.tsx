'use client';

import { useEffect, useState } from 'react';
import { applyThemeColor } from '@/lib/theme';

const STORAGE_KEY = 'bibliophagist-theme';

export default function ThemeToggle() {
  // Starts as null so the button doesn't show (or announce) the wrong
  // label before we know which theme is actually active.
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    let current = document.documentElement.getAttribute('data-theme');

    if (!current) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        current = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', current);
      } catch {
        current = 'light';
      }
    }

    // This route (and specifically the not-found/error shell) doesn't
    // always execute the blocking theme-init <script> the way normal
    // pages do, so this effect re-checks and corrects the theme
    // client-side after mount. A lazy useState initializer alone isn't
    // reliable here across all routes, so we deliberately keep this as
    // an effect-driven sync rather than a pure render-phase computation.
    const resolved = current === 'dark' ? 'dark' : 'light';
    applyThemeColor(resolved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolved);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    applyThemeColor(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can fail in private browsing / disabled storage —
      // the toggle still works for the current page view either way.
    }
    setTheme(next);
  }

  // Before mount we don't know the theme, so there's no honest label yet.
  // Render an inert placeholder of the same size rather than nothing, so
  // the header doesn't shift when the real button appears.
  if (theme === null) {
    return (
      <button type="button" className="theme-toggle" disabled aria-hidden="true" tabIndex={-1}>
        <ToggleIcon />
      </button>
    );
  }

  // Dark mode is the reading room at night, so the toggle is a lamp:
  // dark = lamp on.
  const label = theme === 'dark' ? 'Turn the lamp off (light mode)' : 'Turn the lamp on (dark mode)';

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
      <ToggleIcon />
    </button>
  );
}

// A banker's lamp. Colours come from .theme-toggle-* rules in globals.css,
// so it flips with the theme tokens; the glow only shows in dark mode.
function ToggleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path className="theme-toggle-glow" d="M5 12.5 L2.5 19 H21.5 L19 12.5 Z" />
      <rect className="theme-toggle-metal" x="6" y="19" width="12" height="2" rx="1" />
      <rect className="theme-toggle-metal" x="11.25" y="11" width="1.5" height="8" />
      <path className="theme-toggle-shade" d="M4.5 12.5 L7.5 6 H16.5 L19.5 12.5 Z" />
      <line className="theme-toggle-chain" x1="17" y1="12.5" x2="17" y2="15.5" />
    </svg>
  );
}
