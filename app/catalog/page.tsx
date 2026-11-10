import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import CatalogBrowser from './CatalogBrowser';
import Painting from '@/components/Painting';
import RandomBookLink from '@/components/RandomBookLink';
import { searchBooks, FILTER_KEYS } from '@/lib/search';
import { getGenres, type Genre } from '@/lib/genres';
import { GENRE_CONTENT, defaultPaintingSlot } from '@/lib/genres/content';

export const metadata: Metadata = {
  title: 'Catalog',
};

export const revalidate = 60;

/** How many genres the shelf shows before "All N genres →". */
const SHELF_SIZE = 12;

function toArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;

  // Rebuild the exact query string the client would send, so the SSR first
  // paint and the client's first fetch agree on state. CatalogBrowser no
  // longer takes initialQuery/initialFilters — it reads all of that from
  // the URL itself, which is the single source of truth now.
  const usp = new URLSearchParams();
  const q = typeof resolved.q === 'string' ? resolved.q : '';
  if (q) usp.set('q', q);

  FILTER_KEYS.forEach((key) => {
    toArray(resolved[key]).forEach((v) => usp.append(key, v));
  });

  const sort = typeof resolved.sort === 'string' ? resolved.sort : '';
  if (sort) usp.set('sort', sort);

  usp.set('page', typeof resolved.page === 'string' ? resolved.page : '1');

  // The genre shelf is a way in, not the catalog itself — if genres can't
  // load, the shelf drops out and search still works.
  const [initialData, genres] = await Promise.all([
    searchBooks(usp),
    getGenres().catch((err): Genre[] => {
      console.error('Catalog: could not load genres for the shelf:', err);
      return [];
    }),
  ]);
  const shelf = genres.slice(0, SHELF_SIZE);

  return (
    <section className="section section--flush">
      <div className="section-heading">
        <div className="heading-with-action">
          <h1>The catalog</h1>
          <RandomBookLink iconOnly />
        </div>
      </div>

      <div className="genre-hero">
        <Painting slot="catalog" priority sizes="(max-width: 760px) 100vw, 420px" />
        <p className="prose prose-lg">
          Every book on the shelves, by title, author or tag. Browse a genre, search for something
          particular, or pull a book at random and see where it takes you.
        </p>
      </div>

      {shelf.length > 0 && (
        <nav className="subsection" aria-labelledby="genre-shelf-heading">
          <div className="section-heading">
            <h2 id="genre-shelf-heading" className="subhead">
              Browse by genre
            </h2>
            <Link href="/catalog/genres" className="read-link">
              All {genres.length} genres &rarr;
            </Link>
          </div>
          <ul className="genre-shelf">
            {shelf.map((g) => (
              <li key={g.slug}>
                <Link href={`/catalog/genres/${g.slug}`} className="genre-card">
                  <Painting
                    slot={defaultPaintingSlot(g.stamps)}
                    override={GENRE_CONTENT[g.tag]?.painting}
                    sizes="180px"
                    decorative
                    showLabel={false}
                  />
                  <span className="genre-card-name">{g.tag}</span>
                  <span className="genre-card-count">
                    {g.count} {g.count === 1 ? 'book' : 'books'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="subsection">
        <Suspense fallback={<p className="catalog-count">Loading…</p>}>
          <CatalogBrowser initialData={initialData} />
        </Suspense>
      </div>

      <div className="back-row">
        <Link href="/ledger" className="read-link">
          The ledger: what this library is made of &rarr;
        </Link>
      </div>
    </section>
  );
}
