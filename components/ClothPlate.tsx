/**
 * The cover for a book that has none: a plain cloth binding with the title
 * and call number blocked on it. One in five books has no cover image, so
 * this is a designed state, not a fallback.
 *
 * The cloth colour is picked from the call number (or title), so a book
 * keeps the same binding everywhere and a shelf of them varies: cognac
 * leather or moss (see .cloth-plate--* in globals.css).
 */
const TONES = ['leather', 'moss'] as const;

function toneFor(key: string): (typeof TONES)[number] {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

export default function ClothPlate({
  title,
  bookId,
  size = 'card',
}: {
  title: string;
  bookId?: string | null;
  size?: 'card' | 'page';
}) {
  return (
    // Decorative: the title and call number are always printed beside it.
    <div className={`cloth-plate cloth-plate--${toneFor(bookId || title)} cloth-plate--${size}`} aria-hidden="true">
      <span className="cloth-plate-title">{title}</span>
      {bookId && <span className="cloth-plate-call">{bookId}</span>}
    </div>
  );
}
