import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBooks } from '@/lib/search';
import Painting from '@/components/Painting';
import BookCard from '@/components/BookCard';
import {
  crowd,
  decades,
  doorstops,
  firstsAndLasts,
  genreLengths,
  genreRatings,
  glance,
  lengths,
  topAuthors,
  topSeries,
  type BookLine,
} from '@/lib/ledger';
import { ColumnBars, GenreRatingDots, RangeBars, RankedBars } from './LedgerCharts';

export const metadata: Metadata = {
  title: 'The Ledger',
  description:
    'What the library is made of: its genres and how the crowd rates them, its authors and series, when its books were written and how long they run.',
};

// Built from the cached book list (tag `books`), which the Sanity webhook
// refreshes on publish; this is only the safety net.
export const revalidate = 86400;

const number = (n: number) => n.toLocaleString('en-GB');
const plural = (n: number, word: string, many = `${word}s`) => `${number(n)} ${n === 1 ? word : many}`;

/** Linked titles, each with its author and a figure (a rating, or pages). */
function BookList({ books, unit }: { books: BookLine[]; unit: 'rating' | 'pages' }) {
  return (
    <ol className="ledger-list">
      {books.map((b) => (
        <li key={b.slug}>
          <Link href={`/catalog/${b.slug}`}>{b.title}</Link>
          <span className="ledger-list-meta">
            {b.author && `${b.author} · `}
            {unit === 'pages' ? `${number(b.value)} pages` : b.value.toFixed(2)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default async function LedgerPage() {
  const books = await getAllBooks().catch((err) => {
    console.error('Ledger: could not load the books:', err);
    return [];
  });

  const g = glance(books);
  const ratings = genreRatings(books);
  const people = crowd(books);
  const authors = topAuthors(books);
  const series = topSeries(books);
  const byDecade = decades(books);
  const genreLength = genreLengths(books);
  const byLength = lengths(books);
  const longest = doorstops(books);
  const extremes = firstsAndLasts(books);

  // The dots' axis: from 3.5 (or lower, if a genre sits below it) to 4.5
  // (or higher), in tenths.
  const averages = ratings.rows.map((r) => r.average);
  const axisMin = Math.min(3.5, Math.floor(Math.min(...averages, 3.5) * 10) / 10);
  const axisMax = Math.max(4.5, Math.ceil(Math.max(...averages, 4.5) * 10) / 10);

  // The columns of the ledger entry, left to right.
  const entry = [
    { head: 'Books', value: number(g.books) },
    { head: 'Authors', value: number(g.authors) },
    { head: 'Pages per book', value: number(g.averagePages) },
    { head: 'Series', value: number(g.series) },
    { head: 'Fiction', value: `${Math.round(g.fictionShare * 100)}%` },
  ];
  const tallied = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className="section section--flush">
      <div className="section-heading">
        <h1>The Ledger</h1>
      </div>

      <div className="genre-hero ledger-hero">
        <Painting slot="ledger" priority sizes="(max-width: 760px) 100vw, 420px" />
        <div>
          <p className="prose prose-lg">What the library is made of, counted.</p>
          {g.books > 0 && (
            <p className="prose">
              {plural(g.books, 'book')} by {plural(g.authors, 'author')}
              {g.oldest !== undefined && g.newest !== undefined && `, first published between ${g.oldest} and ${g.newest}`}.
            </p>
          )}
        </div>
      </div>

      {g.books === 0 ? (
        <p className="room-empty">The ledger can&rsquo;t be read just now. Try again in a little while.</p>
      ) : (
        <>
          {/* 1. At a glance */}
          <section className="ledger-block" aria-labelledby="ledger-glance">
            <h2 id="ledger-glance" className="subhead">
              At a glance
            </h2>
            {/* One entry ruled into a ledger: blue lines across, red rules
                between the columns, the figures in ink. */}
            <p className="ledger-tallied">Tallied {tallied}</p>
            <dl className="ledger-entry">
              {entry.map((col) => (
                <div key={col.head}>
                  <dt>{col.head}</dt>
                  <dd>{col.value}</dd>
                </div>
              ))}
            </dl>
            <p className="ledger-footnote">
              Pages per book is the average across the {plural(g.booksWithPages, 'book')} with a page count on
              file.
            </p>
          </section>

          {/* 2. What kind */}
          <section className="ledger-block" aria-labelledby="ledger-kind">
            <h2 id="ledger-kind" className="subhead">
              What kind of books
            </h2>
            <p className="ledger-note">
              The Goodreads average for each genre on the shelves. The scale starts at {axisMin.toFixed(1)}, not
              zero, so the gaps are easier to see; they&rsquo;re smaller than they look.
            </p>
            {ratings.rows.length > 0 && (
              <GenreRatingDots rows={ratings.rows} axisMin={axisMin} axisMax={axisMax} />
            )}
            <p className="ledger-footnote">
              Genres are tags on 10 or more books, leaving out the wings, audiences, formats and moods.{' '}
              {ratings.unrated > 0 && `${plural(ratings.unrated, 'book')} in them ${ratings.unrated === 1 ? 'has' : 'have'} no Goodreads rating.`}
            </p>

            <div className="ledger-pair">
              <section aria-labelledby="ledger-favourites">
                <h3 id="ledger-favourites" className="ledger-subhead">
                  Crowd favourites
                </h3>
                <BookList books={people.favourites} unit="rating" />
              </section>
              <section aria-labelledby="ledger-sceptics">
                <h3 id="ledger-sceptics" className="ledger-subhead">
                  Crowd sceptics
                </h3>
                <BookList books={people.sceptics} unit="rating" />
              </section>
            </div>
            {people.perfect > 0 && (
              <p className="ledger-footnote">
                {plural(people.perfect, 'perfect 5.0')} left out of the favourites: a handful of votes, not a crowd.
              </p>
            )}
          </section>

          {/* 3. Who */}
          <div className="ledger-pair ledger-block">
            <section aria-labelledby="ledger-authors">
              <h2 id="ledger-authors" className="subhead">
                Most-shelved authors
              </h2>
              <p className="ledger-note">
                {number(authors.single)} of {number(authors.authors)} authors have one book here.
              </p>
              <RankedBars
                rows={authors.rows}
                caption="Books per author"
                column="Author"
                summary={`Top ${authors.rows.length} authors by books on the shelves${authors.rows[0] ? `, led by ${authors.rows[0].label} with ${authors.rows[0].count}` : ''}.`}
              />
              {authors.noAuthor > 0 && (
                <p className="ledger-footnote">{plural(authors.noAuthor, 'book')} with no author on file.</p>
              )}
            </section>
            <section aria-labelledby="ledger-series">
              <h2 id="ledger-series" className="subhead">
                Longest series
              </h2>
              <p className="ledger-note">
                {plural(series.inSeries, 'book')} belong to one of {number(series.series)} series.
              </p>
              <RankedBars
                rows={series.rows}
                caption="Books per series"
                column="Series"
                summary={`Top ${series.rows.length} series by books on the shelves${series.rows[0] ? `, led by ${series.rows[0].label} with ${series.rows[0].count}` : ''}.`}
              />
            </section>
          </div>

          {/* 4. When */}
          <section className="ledger-block" aria-labelledby="ledger-when">
            <h2 id="ledger-when" className="subhead">
              When they were written
            </h2>
            <p className="ledger-note">Books by the decade they were first published.</p>
            <ColumnBars
              rows={byDecade.rows}
              caption="Books per decade first published"
              column="Decade"
              summary="Books per decade of first publication, from before 1900 to now."
            />
            {byDecade.noYear > 0 && (
              <p className="ledger-footnote">
                {plural(byDecade.noYear, 'book')} with no year on file{byDecade.noYear === 1 ? ' isn’t' : ' aren’t'} counted.
              </p>
            )}
          </section>

          {/* 5. How long */}
          <div className="ledger-pair ledger-block">
            <section aria-labelledby="ledger-length">
              <h2 id="ledger-length" className="subhead">
                How long they run
              </h2>
              <ColumnBars
                rows={byLength.rows}
                caption="Books per 100 pages"
                column="Pages"
                summary="Books by page count, in bins of 100 pages."
              />
              {byLength.noPages > 0 && (
                <p className="ledger-footnote">
                  {plural(byLength.noPages, 'book')} with no page count on file{byLength.noPages === 1 ? ' isn’t' : ' aren’t'} counted.
                </p>
              )}
            </section>
            {longest.length > 0 && (
              <section aria-labelledby="ledger-doorstops">
                <h2 id="ledger-doorstops" className="subhead">
                  Doorstops
                </h2>
                <BookList books={longest} unit="pages" />
              </section>
            )}
          </div>

          {genreLength.length > 0 && (
            <section className="ledger-block" aria-labelledby="ledger-genre-length">
              <h3 id="ledger-genre-length" className="ledger-subhead">
                Each genre&rsquo;s length
              </h3>
              <p className="ledger-note">
                The bar spans the middle half of a genre&rsquo;s page counts; the dot is the median.
              </p>
              <RangeBars
                rows={genreLength}
                unit="pages"
                caption="Page counts by genre"
                summary={`Page counts by genre: longest ${genreLength[0].tag}, median ${genreLength[0].median} pages; shortest ${genreLength[genreLength.length - 1].tag}, median ${genreLength[genreLength.length - 1].median} pages.`}
              />
            </section>
          )}

          {/* 6. Firsts and lasts */}
          {extremes.length > 0 && (
            <section className="ledger-block" aria-labelledby="ledger-extremes">
              <h2 id="ledger-extremes" className="subhead">
                Firsts and lasts
              </h2>
              <div className="catalog-strip ledger-extremes">
                {extremes.map(({ label, detail, book }) => (
                  <div key={label} className="ledger-extreme">
                    <p className="eyebrow-label">
                      {label} <span className="ledger-extreme-detail">· {detail}</span>
                    </p>
                    <BookCard
                      slug={book.slug}
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      bookId={book.bookId}
                      tags={book.tags}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="back-row">
        <Link href="/catalog" className="btn btn-secondary">
          &larr; Back to the catalog
        </Link>
      </div>
    </section>
  );
}
