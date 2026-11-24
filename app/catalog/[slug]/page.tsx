import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBooks, getBookBySlug } from '@/lib/sanity';
import Image from 'next/image';
import RandomBookLink from '@/components/RandomBookLink';
import BorrowPanel from '@/components/BorrowPanel';
import { isAuthConfigured } from '@/lib/auth/server';
import Breadcrumbs, { BROWSE, CATALOG } from '@/components/Breadcrumbs';
import PageIndex from '@/components/PageIndex';
import ClothPlate from '@/components/ClothPlate';
import { PickRibbon } from '@/components/BookCard';
import { LIBRARIANS_PICK_TAG, WING_LABEL, bookStamps, genreSlug, isGenreTag } from '@/lib/genres/shared';
import { cleanSeries } from '@/lib/search/catalog-facets';

export const revalidate = 60;

export async function generateStaticParams() {
  const books = await getBooks();
  // Books without a slug (e.g. not yet backfilled) have no valid URL —
  // skip them rather than passing a null/object value to the router.
  return books
    .filter((book) => typeof book.slug === 'string' && book.slug.length > 0)
    .map((book) => ({ slug: book.slug }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const book = await getBookBySlug(params.slug);
  if (!book) {
    return { title: 'Not found' };
  }
  return {
    title: book.title,
    description: book.notes || `${book.title}${book.author ? ` by ${book.author}` : ''}, filed in the catalog.`,
  };
}

export default async function BookPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const book = await getBookBySlug(params.slug);

  if (!book) {
    notFound();
  }

  const stamps = bookStamps(book.tags);
  const isPick = Boolean(book.tags?.includes(LIBRARIANS_PICK_TAG));
  // Fiction / Non-Fiction show as stamps and the pick as a ribbon, so the
  // tag list is just the genres.
  const genres = (book.tags || []).filter(isGenreTag);
  const year = book.publishingDate?.slice(0, 4);
  const imprint = [book.publisher, year].filter(Boolean).join(' · ');
  const series = cleanSeries(book.series);

  return (
    <section className="section section--flush">
      <Breadcrumbs trail={[BROWSE, CATALOG, { label: book.title }]} />
      {/* Phones only: a short page on wider screens. */}
      <PageIndex
        phoneOnly
        items={[
          { id: 'book', label: 'The book' },
          { id: 'librarian-slip-heading', label: 'From the librarian’s desk' },
          ...(genres.length > 0 ? [{ id: 'filed-under', label: 'Filed under' }] : []),
          { id: 'borrow-it', label: 'Borrow it' },
        ]}
      />
      <div className="book-detail" id="book">
        <div className="book-detail-cover-wrap">
          {book.coverUrl ? (
            <Image
              className="book-detail-cover"
              src={book.coverUrl}
              alt=""
              fill
              sizes="(max-width: 600px) 100vw, 260px"
              priority
            />
          ) : (
            <ClothPlate title={book.title} bookId={book.bookId} size="page" />
          )}
          {isPick && <PickRibbon />}
        </div>

        <div className="book-detail-body">
          {/* Call number + stamps, like the top of a catalog card. */}
          <div className="stamp-row book-detail-stamps">
            <span className="call-number">{book.bookId || 'Uncatalogued'}</span>
            {stamps.map((wing) => (
              <span
                key={wing}
                className={`status-stamp${wing === 'non-fiction' ? ' status-stamp--muted' : ''}`}
              >
                {WING_LABEL[wing]}
              </span>
            ))}
          </div>

          <h1 className="book-detail-title">{book.title}</h1>

          {book.author && <p className="book-detail-author">{book.author}</p>}
          {series && (
            <p className="book-detail-imprint">
              Series:{' '}
              <Link href={`/catalog?${new URLSearchParams({ series })}`} className="read-link">
                {series} &rarr;
              </Link>
            </p>
          )}
          {imprint && <p className="book-detail-imprint">{imprint}</p>}
          {isPick && <p className="book-detail-pick">A librarian&rsquo;s pick</p>}

          {book.description && <p className="prose prose-lg">{book.description}</p>}

          <aside className="librarian-slip" aria-labelledby="librarian-slip-heading">
            <h2 id="librarian-slip-heading" className="librarian-slip-heading">
              From the librarian&rsquo;s desk
            </h2>
            {book.notes ? (
              <p className="librarian-slip-notes">{book.notes}</p>
            ) : (
              <p className="librarian-slip-notes">
                No notes yet &mdash; ask me about it when you borrow it.
              </p>
            )}
            <p className="librarian-slip-signature">&mdash; A. Rajwade</p>
          </aside>

          {genres.length > 0 && (
            <div className="mb-md">
              <h2 id="filed-under" className="eyebrow-label">
                Filed under
              </h2>
              <div className="book-theme-tags">
                {genres.map((t) => (
                  <Link key={t} href={`/catalog/genres/${genreSlug(t)}`} className="book-theme-tag">
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div id="borrow-it">
            {/* M3: availability, "Request this book" and the waitlist, fetched
                in the browser for signed-in people, so this page stays cached
                for everyone. Not shown on a deployment without sign-in. */}
            {isAuthConfigured && <BorrowPanel bookId={book._id} />}
            <div className="btn-row borrow-links">
              <Link href="/borrow" className="btn btn-secondary">
                How borrowing works
              </Link>
              {book.link && (
                <a href={book.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Find this book &rarr;
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="back-row">
        <div className="btn-row btn-row--center">
          <Link href="/catalog" className="btn btn-secondary">
            &larr; Back to the catalog
          </Link>
          <RandomBookLink className="btn btn-secondary" />
        </div>
      </div>
    </section>
  );
}
