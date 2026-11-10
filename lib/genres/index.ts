import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sanityClient, isSanityConfigured } from '@/lib/sanity/client';
import { PLACEHOLDER_BOOKS } from '@/lib/sanity/placeholder-books';
import type { Book } from '@/lib/sanity/types';
import { BOOKS_TAG } from '@/lib/search/sanity';
import { FICTION_TAG, NON_FICTION_TAG, genreSlug, isGenreTag, stampsFor, type Wing } from './shared';

export * from './shared';

/**
 * Genres, derived from the tags on the books (M1-DESIGN.md). Server-only —
 * client components import './shared' instead.
 *
 * Always read from Sanity, whichever search backend is running, and cached
 * under the same `books` tag as the search index, so the Sanity webhook
 * refreshes both on every publish.
 */

export interface Genre {
  tag: string;
  slug: string;
  count: number;
  stamps: Wing[];
  /** The genres most often found on the same books, most common first. */
  related: string[];
}

const RELATED_LIMIT = 6;

const TAGS_QUERY = `*[_type == "book" && defined(slug.current)]{ tags }`;

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  if (typeof value === 'string' && value.trim() !== '') return [value];
  return [];
}

function buildGenres(tagLists: string[][]): Genre[] {
  const stats = new Map<string, { count: number; fiction: number; nonFiction: number; co: Map<string, number> }>();

  for (const raw of tagLists) {
    const tags = Array.from(new Set(raw));
    const isFiction = tags.includes(FICTION_TAG);
    const isNonFiction = tags.includes(NON_FICTION_TAG);
    const genres = tags.filter(isGenreTag);

    for (const tag of genres) {
      let s = stats.get(tag);
      if (!s) {
        s = { count: 0, fiction: 0, nonFiction: 0, co: new Map() };
        stats.set(tag, s);
      }
      s.count++;
      if (isFiction) s.fiction++;
      if (isNonFiction) s.nonFiction++;
      for (const other of genres) {
        if (other !== tag) s.co.set(other, (s.co.get(other) || 0) + 1);
      }
    }
  }

  return Array.from(stats, ([tag, s]) => ({
    tag,
    slug: genreSlug(tag),
    count: s.count,
    stamps: stampsFor(s.count, s.fiction, s.nonFiction),
    related: Array.from(s.co)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, RELATED_LIMIT)
      .map(([other]) => other),
  })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Throws on a Sanity failure, so a blip is never cached as "no genres". */
const loadGenres = unstable_cache(
  async (): Promise<Genre[]> => {
    const rows = await sanityClient!.fetch<{ tags?: unknown }[]>(TAGS_QUERY);
    return buildGenres((rows || []).map((r) => toArray(r.tags)));
  },
  ['genres'],
  { tags: [BOOKS_TAG], revalidate: 3600 }
);

/** Every genre, largest first. Throws if Sanity can't be reached. */
export async function getGenres(): Promise<Genre[]> {
  if (!isSanityConfigured || !sanityClient) {
    return buildGenres(PLACEHOLDER_BOOKS.map((b) => toArray(b.tags)));
  }
  return loadGenres();
}

export const getGenreBySlug = cache(async (slug: string): Promise<Genre | undefined> => {
  const genres = await getGenres();
  return genres.find((g) => g.slug === slug);
});

// The fields a book card needs. Case-insensitive match, like TSBC's
// books-by-theme query. The param is $genre, not $tag: `tag` is reserved
// by @sanity/client as a request option and won't type-check as a param.
const BOOKS_BY_TAG_QUERY = `*[_type == "book" && defined(slug.current) && count(tags[lower(@) == lower($genre)]) > 0] | order(title asc) {
  _id,
  bookId,
  title,
  "slug": slug.current,
  author,
  tags,
  coverUrl
}`;

/**
 * Every book carrying `tag`, title order. Throws on a Sanity failure so the
 * genre page shows its error boundary (a 5xx) instead of an empty genre.
 */
export async function getBooksByTag(tag: string): Promise<Book[]> {
  const lower = tag.toLowerCase();
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS.filter((b) => toArray(b.tags).some((t) => t.toLowerCase() === lower));
  }
  const books = await sanityClient.fetch<Book[]>(BOOKS_BY_TAG_QUERY, { genre: tag });
  return (books || []).map((b) => ({ ...b, tags: toArray(b.tags) }));
}
