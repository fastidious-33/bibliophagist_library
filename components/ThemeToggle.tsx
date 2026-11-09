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

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <ToggleIcon />
    </button>
  );
}

// Colours come from .theme-toggle-* rules in globals.css, so the icon
// flips with the theme tokens instead of carrying its own hexes.
function ToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect className="theme-toggle-cover" x="4" y="3" width="16" height="18" rx="1.5" />
      <rect className="theme-toggle-spine" x="4" y="3" width="3.2" height="18" rx="1" />
      <line className="theme-toggle-rule" x1="9.5" y1="7" x2="17" y2="7" />
      <line className="theme-toggle-rule" x1="9.5" y1="10.5" x2="17" y2="10.5" />
    </svg>
  );
}
