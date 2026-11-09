import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBooks, getBookBySlug } from '@/lib/sanity';
import Image from 'next/image';
import RandomBookLink from '@/components/RandomBookLink';

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

  return (
    <section className="section section--flush">
      <div className="section-heading">
        <span className="call-number">{(book.theme && book.theme[0]) || 'Uncategorized'}</span>
      </div>

      <div className="book-detail">
        {book.coverUrl && (
          <div className="book-detail-cover-wrap">
            <Image
              className="book-detail-cover"
              src={book.coverUrl}
              alt=""
              fill
              sizes="(max-width: 600px) 100vw, 220px"
              priority
            />
          </div>
        )}

        <div className="book-detail-body">
          <span className="eyebrow-label eyebrow-label--muted">Now in the stacks</span>

          <h1 className="book-detail-title">{book.title}</h1>

          {book.author && <p className="author book-detail-author">{book.author}</p>}

          <div className="meta-pill-row mb-sm">
            {book.rating != null && (
              <span className="meta-pill rating" aria-label={`Rated ${book.rating.toFixed(1)} out of 5`}>
                {book.rating.toFixed(1)}
                <span aria-hidden="true">&#9733;</span>
              </span>
            )}
            {book.language && book.language.length > 0 && (
              <span className="meta-pill">{book.language.join(', ')}</span>
            )}
            {book.publisher && <span className="meta-pill">{book.publisher}</span>}
            {book.publishingDate && (
              <span className="meta-pill">Published {book.publishingDate.slice(0, 4)}</span>
            )}
          </div>

          {book.description && (
            <>
              <hr className="hr-dashed" />
              <p className="prose prose-lg mb-sm">{book.description}</p>
            </>
          )}

          {book.notes && (
            <div className="mb-md">
              <h2 className="subhead">Notes</h2>
              <p className="prose prose-lg">{book.notes}</p>
            </div>
          )}

          {book.theme && book.theme.length > 0 && (
            <div className="mb-sm">
              <h2 className="eyebrow-label">Filed under</h2>
              <div className="book-theme-tags">
                {book.theme.map((t) => (
                  <span key={t} className="book-theme-tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {book.link && (
            <a
              href={book.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary book-detail-link"
            >
              Find this book &rarr;
            </a>
          )}
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
