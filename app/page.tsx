import Link from 'next/link';
import { getBooksPreview, getBookCount, getLibrariansPicks } from '@/lib/sanity';
import BookCard from '@/components/BookCard';
import Painting from '@/components/Painting';

// Revalidate this page at most every 60 seconds so new/updated Sanity
// books show up on the live site without needing a redeploy.
export const revalidate = 60;

const DESK_SIZE = 6;

// The vision page (M1-DESIGN.md). Copy is hardcoded for M1 and moves to a
// Sanity `page` document in M2.
export default async function HomePage() {
  const [picks, bookCount] = await Promise.all([getLibrariansPicks(DESK_SIZE), getBookCount()]);

  // Until any book carries the Librarian's Pick tag, the desk shows the
  // newest additions instead — and says so — so the page is never bookless.
  const hasPicks = picks.length > 0;
  const deskBooks = hasPicks ? picks : await getBooksPreview(DESK_SIZE);

  return (
    <>
      <section className="vision">
        <Painting slot="homeHero" className="vision-painting" priority />

        <div className="vision-copy">
          <h1 className="vision-title">Home of a Bibliophagist</h1>
          <p className="vision-etymology">
            <i>biblio</i>: book &middot; <i>phage</i>: eat &mdash; literally, a devourer of books.
          </p>

          <p>
            Reading has been the one constant in my life. My retirement plan has always been the same: a
            room full of books, a comfy armchair, a rug, a fireplace, and jazz drifting from a gramophone
            in the corner.
          </p>
          <p>
            This library is that room, started early:{' '}
            {/* getBookCount() returns null if the count query fails, so a
                Sanity blip reads vaguer instead of wrong. */}
            {bookCount !== null ? <strong>{bookCount} books</strong> : 'hundreds of books'} &mdash; mostly
            fiction, with plenty of strays &mdash; catalogued, shelved, and open for lending.
          </p>
          <p>
            Wander the shelves, pull out whatever catches your eye, and ask to borrow it.{' '}
            <em>Let&rsquo;s read together!</em>
          </p>
        </div>
      </section>

      <section className="section doors" aria-label="Where to go next">
        <Link href="/catalog" className="door">
          <Painting slot="doorCatalog" sizes="(max-width: 760px) 100vw, 520px" decorative />
          <span className="door-title">Enter the catalog</span>
          <span className="door-blurb">Every book on the shelves, searchable.</span>
        </Link>
        <Link href="/librarian" className="door">
          <Painting slot="doorLibrarian" sizes="(max-width: 760px) 100vw, 520px" decorative />
          <span className="door-title">Meet the librarian</span>
          <span className="door-blurb">The reader behind the shelves: writings, features, saved reading.</span>
        </Link>
      </section>

      {deskBooks.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <h2>{hasPicks ? 'On the librarian’s desk' : 'Recently shelved'}</h2>
            <Link href="/catalog" className="read-link">
              See the full catalog &rarr;
            </Link>
          </div>
          <div className="catalog-strip">
            {deskBooks.map((book) => (
              <BookCard
                key={book._id}
                slug={book.slug}
                title={book.title}
                author={book.author}
                coverUrl={book.coverUrl}
                bookId={book.bookId}
                tags={book.tags}
              />
            ))}
          </div>
        </section>
      )}

      <section className="section quotes-clock">
        <h2 className="subhead">Why see the time in such a mundane way?</h2>
        <p className="quotes-clock-label">The time, in literary quotes &mdash; a different line for every minute.</p>
        <iframe
          src="https://www.ticktockquotes.com/"
          title="Literary clock"
          loading="lazy"
          className="quotes-clock-frame"
          // Third-party page. sandbox drops it to minimum privileges —
          // scripts only, no forms, no popups, no top-level navigation, and
          // a separate origin so it can't reach our cookies or storage.
          // referrerPolicy stops us leaking which page each visitor is on.
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
        />
      </section>
    </>
  );
}
