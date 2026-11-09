import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

type BookCardProps = {
  slug: string;
  /** Plain string, or pre-highlighted nodes from catalog search. */
  title: ReactNode;
  author: ReactNode;
  coverUrl?: string | null;
  theme?: string[] | null;
  notes?: string | null;
  language?: string[] | null;
  rating?: number | null;
};

/**
 * The one catalog card, shared by the home strip, /catalog and the
 * books-tagged list on past events. Optional fields simply drop out, so
 * every surface renders the same hierarchy: call number → title → author
 * → blurb → meta row.
 */
export default function BookCard({
  slug,
  title,
  author,
  coverUrl,
  theme,
  notes,
  language,
  rating,
}: BookCardProps) {
  const languages = (language || []).join(', ');
  const hasMeta = Boolean(languages) || rating != null;

  return (
    <Link className="card card--link book-card" href={`/catalog/${slug}`}>
      {/* Cover first: the jacket is what people recognise before the title. */}
      {coverUrl && (
        <Image className="book-cover" src={coverUrl} alt="" width={72} height={108} loading="lazy" />
      )}
      <span className="call-number">{(theme && theme[0]) || 'Uncategorized'}</span>
      <h3>{title}</h3>
      <p className="author">{author}</p>
      {notes && <p className="blurb">{notes}</p>}
      {hasMeta && (
        <div className="meta-row">
          <span>{languages}</span>
          {rating != null && (
            <span className="rating" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
              {rating.toFixed(1)}
              <span aria-hidden="true">&#9733;</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
