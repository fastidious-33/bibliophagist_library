import Link from 'next/link';
import { getBooksPreview, getBookCount } from '@/lib/sanity';
import BookCard from '@/components/BookCard';
import RandomBookLink from '@/components/RandomBookLink';

// Revalidate this page at most every 60 seconds so new/updated Sanity
// books show up on the live site without needing a redeploy.
export const revalidate = 60;

export default async function HomePage() {
  // Only the three books this page renders, and a separate count() for the
  // tally — rather than pulling the entire catalog and slicing it. Both
  // queries are independent, so run them together.
  const [preview, bookCount] = await Promise.all([getBooksPreview(3), getBookCount()]);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A small lending library</span>
          <h1>Books to borrow, read, and bring back.</h1>
          <p>
            The Bibliophagist Library is a personal collection, opened up for
            lending. Browse the catalog, see what&apos;s on the shelf, and ask
            to borrow anything that catches your eye.
          </p>
          <div className="btn-row">
            <Link href="/catalog" className="btn btn-primary">Browse the catalog</Link>
            <Link href="/about" className="btn btn-secondary">How borrowing works</Link>
          </div>
        </div>

        <aside className="stamp-card" aria-label="Library at a glance">
          <span className="stamp-label">On the shelf</span>
          <span className="stamp-date">
            {/* getBookCount() returns null if the count query fails, so a
                Sanity blip shows a vaguer line instead of a wrong number. */}
            {bookCount !== null ? bookCount : '—'}
          </span>
          <dl>
            <dt>Titles in the library</dt>
            <dd>{bookCount !== null ? `${bookCount} and counting` : 'Growing all the time'}</dd>
          </dl>
        </aside>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Recently filed</h2>
          <Link href="/catalog" className="read-link">See full catalog &rarr;</Link>
        </div>
        <div className="catalog-strip">
          {preview.map((book) => (
            <BookCard
              key={book._id}
              slug={book.slug}
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              theme={book.theme}
              notes={book.notes}
              language={book.language}
              rating={book.rating}
            />
          ))}
        </div>
        <div className="back-row">
          <RandomBookLink className="btn btn-secondary" />
        </div>
      </section>
    </>
  );
}
