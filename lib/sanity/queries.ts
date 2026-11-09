import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sanityClient, isSanityConfigured } from './client';
import { PLACEHOLDER_BOOKS } from './placeholder-books';
import type { Book } from './types';

export const BOOKS_QUERY = `*[_type == "book"] | order(title asc) {
  _id,
  bookId,
  title,
  "slug": slug.current,
  author,
  theme,
  tags,
  language,
  rating,
  publishingDate,
  publisher,
  description,
  link,
  coverUrl,
  notes
}`;

// Same field list as BOOKS_QUERY, but filtered to one document by slug —
// Sanity does the filtering server-side, so only one book's data ever
// comes back over the wire.
const BOOK_BY_SLUG_QUERY = `*[_type == "book" && slug.current == $slug][0]{
  _id,
  bookId,
  title,
  "slug": slug.current,
  author,
  theme,
  tags,
  language,
  rating,
  publishingDate,
  publisher,
  description,
  link,
  coverUrl,
  notes
}`;

// Same case-insensitive semantics as a JS filter
// (theme.some(t => t.toLowerCase() === theme.toLowerCase())), but done
// server-side via GROQ's lower() — Sanity filters before sending data back,
// instead of fetching every book and filtering after the fact.
const BOOKS_BY_THEME_QUERY = `*[_type == "book" && count(theme[lower(@) == lower($theme)]) > 0] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  author,
  theme,
  language,
  rating,
  coverUrl,
  notes
}`;

// Fields the homepage preview card actually renders — see app/page.tsx.
// Deliberately narrower than BOOKS_QUERY (skips bookId, publisher,
// description, link, publishingDate, which that widget never displays).
// Ordered by _createdAt desc (newest additions first) — deliberately NOT
// the same "order(title asc)" as the main catalog list, since this widget
// is meant to surface what's recently been added, not an alphabetical slice.
const BOOKS_PREVIEW_QUERY = `*[_type == "book"] | order(_createdAt desc) [0...$count]{
  _id,
  title,
  "slug": slug.current,
  author,
  theme,
  language,
  rating,
  coverUrl,
  notes
}`;

// GROQ has no built-in random-order function, so the random pick happens
// in application code — but we avoid transferring every book's data to do
// it. Two lightweight requests: first ask how many books exist, then pick
// a random position and ask Sanity for just that one book's slug. Total
// data transferred stays tiny (a number, then one slug) no matter how
// large the catalog grows — unlike fetching every slug up front, which
// scales linearly with catalog size.
const BOOK_COUNT_QUERY = `count(*[_type == "book" && defined(slug.current)])`;

// order(_id) gives a stable, consistent ordering so "position $offset"
// means the same thing between the count query and this one — the actual
// order doesn't matter, only that it's deterministic.
const BOOK_SLUG_AT_OFFSET_QUERY = `*[_type == "book" && defined(slug.current)] | order(_id) [$offset]{
  "slug": slug.current
}`;

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.trim() !== '') return [value];
  return [];
}

function normalizeBook(book: Book): Book {
  return {
    ...book,
    theme: toArray(book.theme),
    tags: toArray(book.tags),
    language: toArray(book.language),
  };
}

export async function getBooks(): Promise<Book[]> {
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS;
  }
  try {
    const books = await sanityClient.fetch<Book[]>(BOOKS_QUERY);
    // Some existing entries store theme/tags/language as a single string
    // instead of an array — normalize here so every consumer of
    // getBooks() can safely assume these are always arrays.
    return books.map(normalizeBook);
  } catch (err) {
    console.error('Sanity fetch failed, falling back to placeholder data:', err);
    return PLACEHOLDER_BOOKS;
  }
}

/**
 * Targeted single-book fetch — Sanity filters server-side by slug, rather
 * than fetching every book and finding the match client-side. Same request
 * count as before (still one Sanity call), much smaller payload per call.
 *
 * Wrapped in React's cache() because the book page calls it twice per
 * render (generateMetadata and the page body). The cache lasts one render,
 * so the second call reuses the first result and can never serve stale data.
 */
export const getBookBySlug = cache(async (slug: string): Promise<Book | undefined> => {
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS.find((book) => book.slug === slug);
  }
  try {
    const book = await sanityClient.fetch<Book | null>(BOOK_BY_SLUG_QUERY, { slug });
    return book ? normalizeBook(book) : undefined;
  } catch (err) {
    console.error('Sanity fetch failed for getBookBySlug, falling back to placeholder data:', err);
    return PLACEHOLDER_BOOKS.find((book) => book.slug === slug);
  }
});

export async function getBooksByTheme(theme: string): Promise<Book[]> {
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS.filter((book) =>
      book.theme?.some((t) => t.toLowerCase() === theme.toLowerCase())
    );
  }
  try {
    const books = await sanityClient.fetch<Book[]>(BOOKS_BY_THEME_QUERY, { theme });
    return books.map(normalizeBook);
  } catch (err) {
    console.error('Sanity fetch failed for getBooksByTheme, falling back to placeholder data:', err);
    return PLACEHOLDER_BOOKS.filter((book) =>
      book.theme?.some((t) => t.toLowerCase() === theme.toLowerCase())
    );
  }
}

/**
 * Lean, count-limited fetch for the homepage's book preview widget — same
 * request count as before (one Sanity call), but only `count` documents
 * and only the fields that widget actually renders, instead of every
 * field of every book in the catalog.
 */
export async function getBooksPreview(count: number): Promise<Book[]> {
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS.slice(0, count);
  }
  try {
    const books = await sanityClient.fetch<Book[]>(BOOKS_PREVIEW_QUERY, { count });
    return books.map(normalizeBook);
  } catch (err) {
    console.error('Sanity fetch failed for getBooksPreview, falling back to placeholder data:', err);
    return PLACEHOLDER_BOOKS.slice(0, count);
  }
}

export async function getBookCount(): Promise<number | null> {
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS.length;
  }
  try {
    const count = await sanityClient.fetch<number>(BOOK_COUNT_QUERY);
    return typeof count === 'number' ? count : null;
  } catch (err) {
    console.error('Sanity fetch failed for getBookCount:', err);
    return null;
  }
}

/** Label on the stored count, so the random route can discard it early. */
export const BOOK_COUNT_TAG = 'book-count';

const ONE_WEEK = 60 * 60 * 24 * 7;

/**
 * The book count, kept in Next's Data Cache for a week so a random pick
 * costs one Sanity request instead of two. It survives restarts and
 * redeploys (on Vercel it lives in shared storage, not memory).
 *
 * Throws rather than returning a fallback: a thrown call isn't stored, so a
 * Sanity blip can never be cached as the count for a week.
 * Only call when Sanity is configured.
 */
export const getStoredBookCount = unstable_cache(
  async (): Promise<number> => {
    const count = await sanityClient!.fetch<number>(BOOK_COUNT_QUERY);
    if (typeof count !== 'number') throw new Error('Book count query returned no number');
    return count;
  },
  [BOOK_COUNT_TAG],
  { revalidate: ONE_WEEK, tags: [BOOK_COUNT_TAG] }
);

/** The slug of the book at `offset` in a stable order, or undefined past the end. */
export async function getBookSlugAt(offset: number): Promise<string | undefined> {
  const result = await sanityClient!.fetch<{ slug: string } | null>(BOOK_SLUG_AT_OFFSET_QUERY, {
    offset,
  });
  return result?.slug;
}

const RATING_VALUES_QUERY = `*[_type == "book" && defined(rating)].rating`;

/**
 * Just the numbers — a projection down to a bare array of floats, not full
 * documents. Used only by /ledger for the ratings histogram.
 */
export async function getRatingValues(): Promise<number[]> {
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS.map((b) => b.rating).filter(
      (r): r is number => typeof r === 'number'
    );
  }
  try {
    const values = await sanityClient.fetch<number[]>(RATING_VALUES_QUERY);
    return Array.isArray(values) ? values : [];
  } catch (err) {
    console.error('Sanity fetch failed for getRatingValues:', err);
    return [];
  }
}