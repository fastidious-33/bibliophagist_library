import type { Metadata } from 'next';
import Link from 'next/link';
import { searchBooks } from '@/lib/typesense/search';
import { getRatingValues } from '@/lib/sanity';
import LedgerCharts, { type Counted } from './LedgerCharts';

export const metadata: Metadata = {
  title: 'The Ledger',
  description: 'What the catalog is made of — themes, decades, languages and ratings.',
};

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
  // already computes. NOTE: searchBooks caps facets at 50 values, which is
  // fine for themes/languages but truncates publishingYear if the catalog
  // ever spans more than 50 distinct years — the decade bars would then
  // silently under-count older, sparser decades.
  const usp = new URLSearchParams({ page: '1' });
  const [data, ratingValues] = await Promise.all([searchBooks(usp), getRatingValues()]);

  const themes: Counted[] = data.facets.theme
    .map((f) => ({ label: f.value, count: f.count }))
    .sort((a, b) => b.count - a.count);

  const languages: Counted[] = data.facets.language
    .map((f) => ({ label: f.value, count: f.count }))
    .sort((a, b) => b.count - a.count);

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
          {themes.length > 0 && ` · across ${themes.length} themes`}
        </span>
      </div>

      <LedgerCharts
        themes={themes}
        decades={decades}
        languages={languages}
        ratings={ratings}
      />

      <div className="back-row">
        <Link href="/catalog" className="btn btn-secondary">
          &larr; Back to the catalog
        </Link>
      </div>
    </section>
  );
}
