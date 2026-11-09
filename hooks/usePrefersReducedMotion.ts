'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// The server can't know the user's setting; a stable `false` keeps the
// first client render identical to the server's, so no hydration mismatch.
function getServerSnapshot() {
  return false;
}

/**
 * True when the OS asks for reduced motion. For JS-driven animation only —
 * the global CSS rule in globals.css already covers CSS transitions, but
 * Chart.js animates a canvas on its own loop and never sees it.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
