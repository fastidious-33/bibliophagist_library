import type { Metadata } from 'next';
import Link from 'next/link';
import { searchBooks, type FacetCount } from '@/lib/search';
import { getRatingValues } from '@/lib/sanity';
import LedgerCharts, { type Counted } from './LedgerCharts';

export const metadata: Metadata = {
  title: 'The Ledger',
  description: 'What the catalog is made of — tags, authors, decades and ratings.',
};

/** Tiles in the tags treemap. Free-form tags have a long tail of ones; past
 * this many the tiles get too small to read or click. */
const TOP_TAGS = 30;
const TOP_AUTHORS = 10;

function topCounts(facets: FacetCount[], limit: number): Counted[] {
  return facets
    .map((f) => ({ label: f.value, count: f.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export const revalidate = 3600;

/** Roll a year-level facet up into decade buckets, oldest first. */
function toDecades(facets: { value: string; count: number }[]): Counted[] {
  const buckets = new Map<number, number>();
  for (const f of facets) {
    const year = Number(f.value);
    if (!Number.isInteger(year)) continue;
    const start = Math.floor(year / 10) * 10;
    buckets.set(start, (buckets.get(start) || 0) + f.count);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([start, count]) => ({ label: `${start}s`, count }));
}

/** Bucket raw ratings to the nearest half-point, 0 through 5. */
function toRatingBuckets(values: number[]): Counted[] {
  const buckets = new Map<number, number>();
  for (const v of values) {
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    const rounded = Math.min(5, Math.max(0, Math.round(v * 2) / 2));
    buckets.set(rounded, (buckets.get(rounded) || 0) + 1);
  }
  if (buckets.size === 0) return [];

  // Continuous axis between the lowest and highest score actually present,
  // so gaps read as gaps rather than being silently closed up.
  const keys = Array.from(buckets.keys());
  const lo = Math.min(...keys);
  const hi = Math.max(...keys);
  const out: Counted[] = [];
  for (let r = lo; r <= hi; r += 0.5) {
    out.push({ label: r.toFixed(1), count: buckets.get(r) || 0 });
  }
  return out;
}

export default async function LedgerPage() {
  // One catch-all search gives us the total plus every facet the catalog
  // already computes. The Sanity backend counts every value; Typesense caps
  // each facet at 250 values (lib/typesense/search.ts), which only matters
  // for the author tally on a very large catalog.
  const usp = new URLSearchParams({ page: '1' });
  const [data, ratingValues] = await Promise.all([searchBooks(usp), getRatingValues()]);

  const tags = topCounts(data.facets.tags, TOP_TAGS);
  const authors = topCounts(data.facets.author, TOP_AUTHORS);
  const authorCount = data.facets.author.length;

  const decades = toDecades(data.facets.publishingYear);
  const ratings = toRatingBuckets(ratingValues);

  const years = data.facets.publishingYear
    .map((f) => Number(f.value))
    .filter((n) => Number.isInteger(n));
  const span = years.length > 0 ? { from: Math.min(...years), to: Math.max(...years) } : null;

  return (
    <section className="section section--flush">
      <div className="section-heading">
        <h1>The Ledger</h1>
      </div>

      <div className="ledger-headline">
        <span className="ledger-figure">{data.found}</span>
        <span className="ledger-figure-label">
          books filed
          {span && ` · published ${span.from}–${span.to}`}
          {authorCount > 0 && ` · by ${authorCount} ${authorCount === 1 ? 'author' : 'authors'}`}
        </span>
      </div>

      <LedgerCharts tags={tags} authors={authors} decades={decades} ratings={ratings} />

      <div className="back-row">
        <Link href="/catalog" className="btn btn-secondary">
          &larr; Back to the catalog
        </Link>
      </div>
    </section>
  );
}
