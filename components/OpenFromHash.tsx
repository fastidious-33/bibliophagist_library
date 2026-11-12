'use client';

import { useEffect } from 'react';

/**
 * Opens the <details> named in the address (#its-id), on load and whenever
 * the address changes, so a link like /librarian/saved#environment lands on
 * that topic already open. Also opens it when an in-page link to it is
 * clicked, even if the address already names it (no hashchange then).
 * Renders nothing. The browser does the scrolling.
 */
export default function OpenFromHash() {
  useEffect(() => {
    const openId = (id: string) => {
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    const fromHash = () => openId(decodeURIComponent(window.location.hash.slice(1)));
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (link) openId(decodeURIComponent(link.getAttribute('href')!.slice(1)));
    };

    fromHash();
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', fromHash);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
