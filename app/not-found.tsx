import Link from 'next/link';
import RandomBookLink from '@/components/RandomBookLink';

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-card stamp-card">
        <span className="not-found-eyebrow">Catalog Error</span>

        <div className="not-found-stamp">404</div>

        <h1 className="not-found-title">This card isn&rsquo;t in the catalog.</h1>

        <p className="not-found-copy">
          Either it was never filed, or someone forgot to check it back in.
          Either way, it&rsquo;s not on this shelf.
        </p>

        <div className="not-found-actions btn-row">
          <Link href="/catalog" className="btn btn-primary">
            Browse the catalog
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back to the shelf
          </Link>
        </div>
        <div className="not-found-random">
          <RandomBookLink />
        </div>
      </div>
    </div>
  );
}
