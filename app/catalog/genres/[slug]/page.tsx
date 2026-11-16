import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookCard from '@/components/BookCard';
import Painting from '@/components/Painting';
import Breadcrumbs, { BROWSE, CATALOG, GENRES } from '@/components/Breadcrumbs';
import PageIndex from '@/components/PageIndex';
import {
  LIBRARIANS_PICK_TAG,
  WING_LABEL,
  genreSlug,
  getBooksByTag,
  getGenreBySlug,
  getGenres,
} from '@/lib/genres';
import { GENRE_CONTENT, defaultPaintingSlot } from '@/lib/genres/content';
import GenreBooksList from './GenreBooksList';

// Built like TSBC's theme pages (app/initiatives/[slug]/[instance] there):
// ISR, one static page per genre, paging in the browser.
export const revalidate = 60;

const PICKS_LIMIT = 6;

export async function generateStaticParams() {
  // A Sanity blip at build time shouldn't fail the build — the pages then
  // render on first visit instead.
  try {
    const genres = await getGenres();
    return genres.map((g) => ({ slug: g.slug }));
  } catch (err) {
    console.error('Could not list genres at build time; they will render on demand:', err);
    return [];
  }
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return { title: 'Not found' };
  const intro = GENRE_CONTENT[genre.tag]?.intro?.[0];
  return {
    title: genre.tag,
    description: intro || `${genre.count} ${genre.count === 1 ? 'book' : 'books'} filed under ${genre.tag}.`,
  };
}

export default async function GenrePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const genre = await getGenreBySlug(slug);
  if (!genre) notFound();

  const books = await getBooksByTag(genre.tag);
  const content = GENRE_CONTENT[genre.tag];
  const picks = books.filter((b) => b.tags?.includes(LIBRARIANS_PICK_TAG)).slice(0, PICKS_LIMIT);

  return (
    <section className="section section--flush">
      <Breadcrumbs trail={[BROWSE, CATALOG, GENRES, { label: genre.tag }]} />
      <div className="genre-hero">
        <Painting
          slot={defaultPaintingSlot(genre.stamps)}
          override={content?.painting}
          priority
          sizes="(max-width: 760px) 100vw, 420px"
        />

        <div>
          {genre.stamps.length > 0 && (
            <div className="stamp-row">
              {genre.stamps.map((wing) => (
                <span
                  key={wing}
                  className={`status-stamp${wing === 'non-fiction' ? ' status-stamp--muted' : ''}`}
                >
                  {WING_LABEL[wing]}
                </span>
              ))}
            </div>
          )}

          <div className="section-heading">
            <h1>{genre.tag}</h1>
            <span className="section-count">
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </span>
          </div>

          {content?.intro?.map((para, i) => (
            <p key={i} className="prose prose-lg">
              {para}
            </p>
          ))}

          {genre.related.length > 0 && (
            <nav className="genre-related" aria-label="Related genres">
              <h2 id="shelved-with" className="eyebrow-label">
                Often shelved with
              </h2>
              <div className="book-theme-tags">
                {genre.related.map((tag) => (
                  <Link key={tag} href={`/catalog/genres/${genreSlug(tag)}`} className="book-theme-tag">
                    {tag}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* Phones only: a short page on wider screens. */}
      <PageIndex
        phoneOnly
        items={[
          ...(genre.related.length > 0 ? [{ id: 'shelved-with', label: 'Often shelved with' }] : []),
          ...(picks.length > 0 ? [{ id: 'genre-picks', label: 'Librarian’s picks' }] : []),
          { id: 'on-the-shelf', label: 'On the shelf' },
        ]}
      />

      {picks.length > 0 && (
        <div className="subsection">
          <h2 id="genre-picks" className="subhead">
            Librarian&rsquo;s picks
          </h2>
          <div className="catalog-strip">
            {picks.map((book) => (
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
        </div>
      )}

      <div className="subsection">
        <h2 id="on-the-shelf" className="subhead">
          On the shelf
        </h2>
        {books.length === 0 ? (
          <div className="catalog-empty">
            <p>No books carry this tag right now &mdash; they&rsquo;ll show up here once they do.</p>
          </div>
        ) : (
          <Suspense fallback={<p className="catalog-count">Loading…</p>}>
            <GenreBooksList books={books} genreName={genre.tag} />
          </Suspense>
        )}
      </div>

      <div className="back-row">
        <div className="btn-row btn-row--center">
          <Link href="/catalog/genres" className="btn btn-secondary">
            &larr; All genres
          </Link>
          <Link href={`/catalog?tags=${encodeURIComponent(genre.tag)}`} className="btn btn-secondary">
            Search and filter within the catalog &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
