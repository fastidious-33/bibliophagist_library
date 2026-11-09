import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import CatalogBrowser from './CatalogBrowser';
import RandomBookLink from '@/components/RandomBookLink';
import { searchBooks } from '@/lib/typesense/search';

export const metadata: Metadata = {
  title: 'Catalog',
};

export const revalidate = 60;

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

  (['theme', 'tags', 'language', 'band'] as const).forEach((key) => {
    toArray(resolved[key]).forEach((v) => usp.append(key, v));
  });

  const sort = typeof resolved.sort === 'string' ? resolved.sort : '';
  if (sort) usp.set('sort', sort);

  usp.set('page', typeof resolved.page === 'string' ? resolved.page : '1');

  const initialData = await searchBooks(usp);

  return (
    <section className="section section--flush">
      <div className="section-heading">
        <div className="heading-with-action">
          <h1>The catalog</h1>
          <RandomBookLink iconOnly />
        </div>
        <Link href="/ledger" className="read-link">
          The ledger &rarr;
        </Link>
      </div>
      <Suspense fallback={<p className="catalog-count">Loading…</p>}>
        <CatalogBrowser initialData={initialData} />
      </Suspense>
    </section>
  );
}
