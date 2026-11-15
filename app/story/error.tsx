'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Segment-scoped boundary for /story.
//
// app/story/page.tsx reads the book list during server render. If Sanity
// can't answer, the page throws instead of drawing an empty story: a thrown
// render is not cached, and it returns a 5xx (search engines retry a 5xx
// later; a friendly 200 would be kept for the whole revalidate window).
export default function StoryError({
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
        <span className="not-found-eyebrow">Story Unavailable</span>

        <div className="not-found-stamp">WAIT</div>

        <h1 className="not-found-title">The story can&rsquo;t be read just now.</h1>

        <p className="not-found-copy">
          The shelves couldn&rsquo;t be counted. Try again in a little while.
        </p>

        {error.digest && <p className="not-found-copy error-digest">Reference: {error.digest}</p>}

        <div className="not-found-actions btn-row">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/catalog" className="btn btn-secondary">
            Back to the catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
