'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Segment-scoped boundary for /catalog.
//
// app/catalog/page.tsx calls searchBooks() during server render. The search
// container has no persistent disk and rebuilds its index from Sanity on
// every boot, so there's a window after any restart where that call fails.
//
// Deliberately NOT handled by returning an empty result from page.tsx:
// CatalogBrowser skips its own fetch on mount (it trusts the SSR data), so
// an empty response would render a convincingly empty catalog with no
// retry — worse than an error, because it looks like there are no books.
// Erroring here is honest, and "Try again" is the correct action when the
// cause is a few seconds of warm-up.
export default function CatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="not-found">
      <div className="not-found-card stamp-card">
        <span className="not-found-eyebrow">Catalog Unavailable</span>

        <div className="not-found-stamp">WAIT</div>

        <h1 className="not-found-title">The catalog is being re-shelved.</h1>

        <p className="not-found-copy">
          Search is starting back up and can&rsquo;t answer just yet. It
          usually takes a few seconds &mdash; try again in a moment.
        </p>

        {error.digest && (
          <p className="not-found-copy error-digest">
            Reference: {error.digest}
          </p>
        )}

        <div className="not-found-actions btn-row">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Back to the shelf
          </Link>
        </div>
      </div>
    </div>
  );
}