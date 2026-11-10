import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import ClothPlate from '@/components/ClothPlate';
import { LIBRARIANS_PICK_TAG } from '@/lib/genres/shared';

type BookCardProps = {
  slug: string;
  /** Plain string, or pre-highlighted nodes from catalog search. */
  title: ReactNode;
  /** The title as text, for the cloth plate when `title` is highlighted nodes. */
  plainTitle?: string;
  author: ReactNode;
  coverUrl?: string | null;
  /** The library's call number, e.g. "B669". */
  bookId?: string | null;
  /** Only read for the Librarian's Pick mark; tags aren't shown on cards. */
  tags?: string[] | null;
};

/**
 * The one book card, shared by the home desk, /catalog and genre pages.
 * Cover-led (M1-DESIGN.md): people browse a shelf by its jackets. Tags,
 * rating and notes live on the book's own page.
 */
export default function BookCard({ slug, title, plainTitle, author, coverUrl, bookId, tags }: BookCardProps) {
  const isPick = Boolean(tags?.includes(LIBRARIANS_PICK_TAG));

  return (
    <Link className="book-card" href={`/catalog/${slug}`}>
      <div className="book-card-cover">
        {coverUrl ? (
          <Image src={coverUrl} alt="" fill sizes="(max-width: 520px) 45vw, 180px" loading="lazy" />
        ) : (
          <ClothPlate title={plainTitle ?? (typeof title === 'string' ? title : '')} bookId={bookId} />
        )}
        {isPick && <PickRibbon />}
      </div>
      <span className="call-number">{bookId || 'Uncatalogued'}</span>
      <h3>{title}</h3>
      <p className="author">{author}</p>
    </Link>
  );
}

/** A bookmark ribbon hanging from the top of the cover. */
export function PickRibbon() {
  return (
    <span className="pick-ribbon" title="Librarian's pick">
      <span className="visually-hidden">Librarian&rsquo;s pick</span>
    </span>
  );
}
