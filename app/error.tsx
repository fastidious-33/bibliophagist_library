'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error to the console (and later, to an error-tracking
  // service like Sentry) so it doesn't just disappear for visitors.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // No `cabinet` here — the root layout already wraps children in it,
    // so including it again nested the container inside itself.
    <div className="not-found">
      <div className="not-found-card stamp-card">
        <span className="not-found-eyebrow">System Error</span>
        <div className="not-found-stamp">ERR</div>
        <h1 className="not-found-title">Something slipped off the shelf.</h1>

        {/*
          error.message is deliberately not rendered. Next redacts messages
          from server-side throws in production, but client-side errors
          surface verbatim — which can leak internals to visitors.

          The digest is safe: it's an opaque hash Next also writes to the
          server log, so a visitor quoting it gives you something to grep
          for in Vercel's logs.
        */}
        <p className="not-found-copy">
          This page couldn&rsquo;t be loaded. Try again &mdash; if it keeps
          happening, the catalog is still browsable.
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
