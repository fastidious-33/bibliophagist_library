// Sanity -> Typesense: fetch + transform.
//
// IMPORTANT: this file is a plain-JS twin of lib/typesense/transform.ts,
// which the Next.js webhook route (app/api/sanity-webhook/route.ts) uses.
// This one runs standalone under Node inside the Docker container / the
// manual sync script, so it can't import TS directly. If you change the
// field mapping here, change it there too.

const SANITY_QUERY = `*[_type == "book"]{
  _id,
  bookId,
  title,
  author,
  tags,
  rating,
  publishingDate,
  "slug": slug.current,
  coverUrl
}`;

/**
 * Fetch every book from Sanity via the public GROQ HTTP API. No auth token
 * needed — this project's dataset is read-public (see lib/sanity/client.ts).
 */
export async function fetchAllBooksFromSanity({ projectId, dataset }) {
  if (!projectId) {
    throw new Error(
      'Missing Sanity project ID. Set SANITY_PROJECT_ID (or NEXT_PUBLIC_SANITY_PROJECT_ID) in the environment.'
    );
  }
  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${encodeURIComponent(
    SANITY_QUERY
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sanity query failed: ${res.status} ${res.statusText}`);
  }
  const { result } = await res.json();
  return result || [];
}

// Normalizes tags into a real array. Mirrors the same
// defensive coercion already used in lib/sanity/queries.ts — old data or a
// manual Studio edit can leave a scalar where an array is expected, and we
// don't want every consumer (here, the search index) re-implementing this.
function toArray(value) {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value === 'string' && value.trim() !== '') return [value];
  return [];
}

// publishingDate is a plain string, not a Sanity date field — it may be a
// bare year ("1966") or, from older imports, a padded fake date
// ("1966-01-01"). Either way we only trust the first 4 digits; we never
// fabricate a full date, and we never fabricate a year that isn't there.
function parseYear(publishingDate) {
  if (!publishingDate) return undefined;
  const y = String(publishingDate).slice(0, 4);
  return /^\d{4}$/.test(y) ? Number(y) : undefined;
}

/**
 * Sanity book document -> Typesense document.
 * Always overwrites every field from Sanity (the authoritative source) —
 * no partial "fill only if blank" logic, per the project's own pitfalls
 * list: an incomplete blank-check is worse than just always overwriting.
 */
export function bookToTypesenseDoc(book) {
  if (!book.slug) {
    // Typesense requires `slug` (used to link back to /catalog/[slug]).
    // A book with no slug can't be indexed usefully — skip it explicitly
    // rather than writing a doc with an empty required-looking field.
    return null;
  }
  const doc = {
    id: book._id,
    title: book.title || '(untitled)',
    author: book.author || '',
    tags: toArray(book.tags),
    slug: book.slug,
    coverUrl: book.coverUrl || '',
  };
  if (book.bookId) doc.bookId = book.bookId;
  const year = parseYear(book.publishingDate);
  if (year !== undefined) doc.publishingYear = year;
  if (typeof book.rating === 'number') doc.rating = book.rating;
  return doc;
}
