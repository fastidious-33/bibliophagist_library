import { unstable_cache } from 'next/cache';
import { sanityClient, isSanityConfigured } from '@/lib/sanity/client';
import { PLACEHOLDER_BOOKS } from '@/lib/sanity/placeholder-books';
import { BAND_BY_ID, YEAR_BANDS, bandForYear, cleanSeries } from './catalog-facets';
import {
  PAGE_SIZE,
  type BookHit,
  type BooksSearchResponse,
  type FacetCount,
  type FacetField,
  type SearchBook,
} from './types';

/**
 * Catalog search served straight from Sanity, for while Typesense isn't
 * running (see lib/search/index.ts for the switch).
 *
 * At a few hundred to a couple of thousand books, the whole catalog's search
 * fields fit comfortably in one cached projection. So this loads every book
 * once, keeps it in Next's Data Cache under the `books` tag, and does the
 * text match, filters, facet counts, sorting and paging in memory. The
 * Sanity webhook (app/api/sanity-webhook) revalidates the tag on every
 * publish or delete; the daily revalidate is only a safety net.
 *
 * The same cached list feeds /story (getAllBooks below).
 */

export const BOOKS_TAG = 'books';

const INDEX_QUERY = `*[_type == "book" && defined(slug.current)]{
  _id,
  bookId,
  title,
  author,
  tags,
  series,
  rating,
  pages,
  publishingDate,
  originalPublicationYear,
  "slug": slug.current,
  coverUrl
}`;

interface RawBook {
  _id: string;
  bookId?: string;
  title?: string;
  author?: string;
  tags?: unknown;
  series?: unknown;
  rating?: number;
  pages?: number;
  publishingDate?: string;
  originalPublicationYear?: string | number;
  slug?: string;
  coverUrl?: string;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  if (typeof value === 'string' && value.trim() !== '') return [value];
  return [];
}

/** The first 4 characters as a year ("1966", "1966-01-01"), else undefined. */
function parseYear(value?: string | number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const y = String(value).slice(0, 4);
  return /^\d{4}$/.test(y) ? Number(y) : undefined;
}

function toSearchBook(raw: RawBook): SearchBook | null {
  if (!raw.slug) return null;
  const book: SearchBook = {
    id: raw._id,
    title: raw.title || '(untitled)',
    author: raw.author || '',
    tags: toArray(raw.tags),
    slug: raw.slug,
    coverUrl: raw.coverUrl || '',
  };
  if (raw.bookId) book.bookId = raw.bookId;
  const series = cleanSeries(raw.series);
  if (series) book.series = series;
  const year = parseYear(raw.publishingDate);
  if (year !== undefined) book.publishingYear = year;
  const originalYear = parseYear(raw.originalPublicationYear);
  if (originalYear !== undefined) book.originalYear = originalYear;
  if (typeof raw.rating === 'number') book.rating = raw.rating;
  if (typeof raw.pages === 'number' && raw.pages > 0) book.pages = raw.pages;
  return book;
}

/**
 * Throws on a Sanity failure rather than returning [] — a thrown call isn't
 * stored, so a blip can never be cached as an empty catalog.
 */
const loadIndex = unstable_cache(
  async (): Promise<SearchBook[]> => {
    const raw = await sanityClient!.fetch<RawBook[]>(INDEX_QUERY);
    return (raw || []).map(toSearchBook).filter((b): b is SearchBook => b !== null);
  },
  ['books-search-index'],
  { tags: [BOOKS_TAG], revalidate: 86400 }
);

async function getIndex(): Promise<SearchBook[]> {
  if (!isSanityConfigured || !sanityClient) {
    return PLACEHOLDER_BOOKS.map(toSearchBook).filter((b): b is SearchBook => b !== null);
  }
  return loadIndex();
}

/**
 * Every book in the catalog (with a slug), from the same cached list the
 * search uses. For /story, which needs the whole collection rather than a
 * page of results. Throws if Sanity can't be reached.
 */
export async function getAllBooks(): Promise<SearchBook[]> {
  return getIndex();
}

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

/** Lowercase and strip accents, so "garcia" finds "García". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function tokenize(q: string): string[] {
  return Array.from(new Set(fold(q).split(/\s+/).filter(Boolean)));
}

interface Scored {
  book: SearchBook;
  score: number;
  matched: BookHit['matched'];
}

/**
 * Every token must appear somewhere (title, author or a tag) — AND across
 * tokens, like Typesense's default. Matches at the start of a word score
 * higher than ones inside it, and title beats author beats tags.
 */
function scoreBook(book: SearchBook, tokens: string[]): Scored | null {
  const title = fold(book.title);
  const author = fold(book.author);
  const tags = fold(book.tags.join(' | '));

  let score = 0;
  const titleHits: string[] = [];
  const authorHits: string[] = [];

  for (const token of tokens) {
    const wordStart = new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    let hit = false;
    if (title.includes(token)) {
      score += wordStart.test(title) ? 10 : 4;
      titleHits.push(token);
      hit = true;
    }
    if (author.includes(token)) {
      score += wordStart.test(author) ? 6 : 2;
      authorHits.push(token);
      hit = true;
    }
    if (tags.includes(token)) {
      score += wordStart.test(tags) ? 3 : 1;
      hit = true;
    }
    if (!hit) return null;
  }

  // The whole query as a phrase at the start of the title is the best match.
  if (title.startsWith(tokens.join(' '))) score += 15;

  const matched: BookHit['matched'] = {};
  if (titleHits.length) matched.title = titleHits;
  if (authorHits.length) matched.author = authorHits;
  return { book, score, matched };
}

// ---------------------------------------------------------------------------
// Filters and facets
// ---------------------------------------------------------------------------

interface Filters {
  tags: Set<string>;
  series: Set<string>;
  bands: string[];
}

function readFilters(searchParams: URLSearchParams): Filters {
  return {
    tags: new Set(searchParams.getAll('tags')),
    series: new Set(
      searchParams
        .getAll('series')
        .map(cleanSeries)
        .filter((s): s is string => s !== undefined)
    ),
    bands: searchParams.getAll('band').filter((id) => BAND_BY_ID.has(id)),
  };
}

/** Within a field the selected values are OR'd; across fields, AND'd. */
function passesTags(book: SearchBook, f: Filters): boolean {
  return f.tags.size === 0 || book.tags.some((t) => f.tags.has(t));
}

function passesSeries(book: SearchBook, f: Filters): boolean {
  return f.series.size === 0 || (book.series !== undefined && f.series.has(book.series));
}

function passesBands(book: SearchBook, f: Filters): boolean {
  if (f.bands.length === 0) return true;
  if (book.publishingYear === undefined) return false;
  const band = bandForYear(book.publishingYear);
  return band !== undefined && f.bands.includes(band.id);
}

/** Count values, most common first, then alphabetically. */
function countValues(values: Iterable<string>): FacetCount[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value)
  );
}

function facetValues(books: SearchBook[], field: FacetField): FacetCount[] {
  switch (field) {
    case 'tags':
      return countValues(books.flatMap((b) => b.tags));
    case 'author':
      return countValues(books.map((b) => b.author).filter(Boolean));
    case 'publishingYear':
      return countValues(
        books.filter((b) => b.publishingYear !== undefined).map((b) => String(b.publishingYear))
      );
  }
}

function bandsPresent(books: SearchBook[]): string[] {
  const present = new Set<string>();
  for (const b of books) {
    if (b.publishingYear === undefined) continue;
    const band = bandForYear(b.publishingYear);
    if (band) present.add(band.id);
  }
  return YEAR_BANDS.filter((b) => present.has(b.id)).map((b) => b.id);
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

const byTitle = (a: Scored, b: Scored) => a.book.title.localeCompare(b.book.title);

/** Books with no year (or no rating) always sink to the end, whichever direction. */
function byNumber(pick: (b: SearchBook) => number | undefined, dir: 1 | -1) {
  return (a: Scored, b: Scored) => {
    const x = pick(a.book);
    const y = pick(b.book);
    if (x === undefined && y === undefined) return byTitle(a, b);
    if (x === undefined) return 1;
    if (y === undefined) return -1;
    return (x - y) * dir || byTitle(a, b);
  };
}

function sortResults(results: Scored[], sortId: string, hasQuery: boolean): void {
  switch (sortId) {
    case 'rating':
      results.sort(byNumber((b) => b.rating, -1));
      return;
    case 'newest':
      results.sort(byNumber((b) => b.publishingYear, -1));
      return;
    case 'oldest':
      results.sort(byNumber((b) => b.publishingYear, 1));
      return;
    default:
      results.sort(hasQuery ? (a, b) => b.score - a.score || byTitle(a, b) : byTitle);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function searchBooksInSanity(
  searchParams: URLSearchParams
): Promise<BooksSearchResponse> {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const tokens = tokenize(searchParams.get('q')?.trim() || '');
  const filters = readFilters(searchParams);

  const index = await getIndex();

  // The text query narrows everything, including the filter options.
  const queried: Scored[] =
    tokens.length === 0
      ? index.map((book) => ({ book, score: 0, matched: undefined }))
      : index.map((book) => scoreBook(book, tokens)).filter((s): s is Scored => s !== null);

  const results = queried.filter(
    (s) => passesTags(s.book, filters) && passesSeries(s.book, filters) && passesBands(s.book, filters)
  );
  sortResults(results, searchParams.get('sort') || 'relevance', tokens.length > 0);

  const found = results.length;
  const totalPages = Math.max(1, Math.ceil(found / PAGE_SIZE));
  const books: BookHit[] = results
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(({ book, matched }) =>
      matched && Object.keys(matched).length > 0 ? { ...book, matched } : { ...book }
    );

  // Disjunctive options: each filter's list ignores its own selection.
  const options = {
    tags: facetValues(
      queried.filter((s) => passesSeries(s.book, filters) && passesBands(s.book, filters)).map((s) => s.book),
      'tags'
    ).map((f) => f.value),
    series: countValues(
      queried
        .filter((s) => passesTags(s.book, filters) && passesBands(s.book, filters))
        .map((s) => s.book.series)
        .filter((s): s is string => s !== undefined)
    ).map((f) => f.value),
    bands: bandsPresent(
      queried.filter((s) => passesTags(s.book, filters) && passesSeries(s.book, filters)).map((s) => s.book)
    ),
  };

  return { books, found, page, totalPages, options };
}
