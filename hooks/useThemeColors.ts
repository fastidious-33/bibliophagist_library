'use client';

import { useMemo, useSyncExternalStore } from 'react';

/**
 * Canvas can't read CSS variables — Chart.js takes colours as plain
 * JavaScript values. So we resolve the theme's computed values here and
 * hand them to the charts as data.
 *
 * ThemeToggle flips a `data-theme` attribute on <html> and doesn't emit an
 * event, so a MutationObserver on that attribute is how we notice. That
 * keeps this decoupled — ThemeToggle needs no changes.
 */
export interface ThemeColors {
  paper: string;
  kraft: string;
  ink: string;
  stamp: string;
  ledger: string;
  charcoal: string;
  charcoalRgb: string;
  stampRgb: string;
  label: string;
}

function read(): ThemeColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    paper: v('--paper'),
    kraft: v('--kraft'),
    ink: v('--ink'),
    stamp: v('--stamp'),
    ledger: v('--ledger'),
    charcoal: v('--charcoal'),
    charcoalRgb: v('--charcoal-rgb'),
    stampRgb: v('--stamp-rgb'),
    label: v('--font-label'),
  };
}

// Light-theme values, matching :root in globals.css. Used on the server and
// for the hydration render, before the real computed values can be read.
const FALLBACK: ThemeColors = {
  paper: '#f3ecdf',
  kraft: '#e6dac4',
  ink: '#2a1f17',
  stamp: '#7a2e2a',
  ledger: '#2f5544',
  charcoal: '#3a2f26',
  charcoalRgb: '58, 47, 38',
  stampRgb: '122, 46, 42',
  label: 'Georgia, serif',
};

const SERVER = '__server__';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

// The snapshot is the theme name (a string, so it's stable between reads);
// the colours are derived from it below. This also covers routes where the
// blocking theme script didn't run — data-theme lands slightly after
// hydration, the observer fires, and the colours follow.
const getSnapshot = () => document.documentElement.getAttribute('data-theme') ?? '';
const getServerSnapshot = () => SERVER;

export function useThemeColors(): ThemeColors {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => (theme === SERVER ? FALLBACK : read()), [theme]);
}
