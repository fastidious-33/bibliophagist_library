import Link from 'next/link';

/**
 * "Pull a random book", with the pulled-book mark. One component so the
 * wording and icon stay identical everywhere it appears.
 *
 * prefetch={false}: /catalog/random picks a book on every request, so
 * prefetching it as the link scrolls into view would spend a Sanity query
 * on a book nobody asked for.
 */
export default function RandomBookLink({
  className = 'read-link',
  iconOnly = false,
}: {
  className?: string;
  /** Just the mark, e.g. beside a heading. Named for screen readers, with
   *  a hover tooltip for mouse users; touch users rely on the text version
   *  appearing elsewhere on the site. */
  iconOnly?: boolean;
}) {
  if (iconOnly) {
    return (
      <Link
        href="/catalog/random"
        prefetch={false}
        className="random-book-link random-book-link--icon"
        aria-label="Pull a random book"
        title="Pull a random book"
      >
        <PulledBookIcon />
      </Link>
    );
  }

  return (
    <Link href="/catalog/random" prefetch={false} className={`random-book-link ${className}`}>
      <PulledBookIcon />
      Pull a random book
    </Link>
  );
}

// Two spines standing on a shelf line, the middle book tilted up and out —
// the one being pulled. currentColor, so it takes the link's colour and
// flips with the theme.
function PulledBookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="4" height="14" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17" y="7" width="4" height="14" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="3" width="5" height="16" rx="0.5" fill="currentColor" transform="rotate(-12 11.5 11)" />
      <line x1="2" y1="21.5" x2="22" y2="21.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
