import type { SearchBook } from '@/lib/search/types';
import { FICTION_TAG, LIBRARIANS_PICK_TAG, NON_FICTION_TAG } from '@/lib/genres/shared';

/**
 * The ledger's numbers (PLAN.md, "Ledger redesign"). Pure functions over the
 * whole catalog, so the page stays a plain read of the cached book list.
 */

export const INDIAN_AUTHORS_TAG = 'Indian Authors';
export const TRANSLATED_TAG = 'Translated Works';

/** A tag counts as a ledger genre once it's on this many books. */
export const GENRE_MIN = 10;

/**
 * Tags that aren't genres for the ledger: the wings, audiences, origins,
 * formats, moods and the catch-all. A new genre tag appears on its own once
 * it reaches GENRE_MIN books.
 */
export const NOT_LEDGER_GENRES = new Set([
  FICTION_TAG,
  NON_FICTION_TAG,
  LIBRARIANS_PICK_TAG,
  'Children',
  'Young Adult',
  INDIAN_AUTHORS_TAG,
  TRANSLATED_TAG,
  'Short Stories Collection',
  'Comics',
  'Light-Hearted',
  'Emotion-Heavy',
  'Miscellaneous',
]);

/** First-published year, else the edition's year. */
export function firstYear(book: SearchBook): number | undefined {
  return book.originalYear ?? book.publishingYear;
}

/** A Goodreads average worth counting (0 means Goodreads had none). */
function rated(book: SearchBook): book is SearchBook & { rating: number } {
  return typeof book.rating === 'number' && book.rating > 0;
}

const byTitle = (a: SearchBook, b: SearchBook) => a.title.localeCompare(b.title);

/* ---------- 1. At a glance ---------- */

export type Glance = {
  books: number;
  authors: number;
  /** Mean page count, rounded, over the books that have one. */
  averagePages: number;
  /** Books with a page count, which the average covers. */
  booksWithPages: number;
  series: number;
  /** Share of books tagged Fiction, 0–1. */
  fictionShare: number;
  oldest?: number;
  newest?: number;
};

export function glance(books: SearchBook[]): Glance {
  const years = books.map(firstYear).filter((y): y is number => y !== undefined);
  const paged = books.filter((b) => b.pages !== undefined);
  const totalPages = paged.reduce((sum, b) => sum + (b.pages ?? 0), 0);
  return {
    books: books.length,
    authors: new Set(books.map((b) => b.author.trim()).filter(Boolean)).size,
    averagePages: paged.length ? Math.round(totalPages / paged.length) : 0,
    booksWithPages: paged.length,
    series: new Set(books.map((b) => b.series).filter(Boolean)).size,
    fictionShare: books.length ? books.filter((b) => b.tags.includes(FICTION_TAG)).length / books.length : 0,
    oldest: years.length ? Math.min(...years) : undefined,
    newest: years.length ? Math.max(...years) : undefined,
  };
}

/* ---------- 2. What kind ---------- */

/** Genre tags with GENRE_MIN+ books, most books first. */
export function ledgerGenres(books: SearchBook[]): { tag: string; books: SearchBook[] }[] {
  const byTag = new Map<string, SearchBook[]>();
  for (const b of books) {
    for (const t of b.tags) {
      if (NOT_LEDGER_GENRES.has(t)) continue;
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t)!.push(b);
    }
  }
  return Array.from(byTag, ([tag, list]) => ({ tag, books: list }))
    .filter((g) => g.books.length >= GENRE_MIN)
    .sort((a, b) => b.books.length - a.books.length || a.tag.localeCompare(b.tag));
}

export type GenreRating = { tag: string; average: number; rated: number; books: number };

/** Each genre's mean Goodreads average over its rated books, highest first. */
export function genreRatings(books: SearchBook[]): {
  rows: GenreRating[];
  /** Books in these genres without a Goodreads average. */
  unrated: number;
} {
  const rows: GenreRating[] = [];
  const unrated = new Set<string>();
  for (const g of ledgerGenres(books)) {
    const scores = g.books.filter(rated).map((b) => b.rating);
    g.books.filter((b) => !rated(b)).forEach((b) => unrated.add(b.id));
    if (scores.length === 0) continue;
    rows.push({
      tag: g.tag,
      average: scores.reduce((s, r) => s + r, 0) / scores.length,
      rated: scores.length,
      books: g.books.length,
    });
  }
  rows.sort((a, b) => b.average - a.average || a.tag.localeCompare(b.tag));
  return { rows, unrated: unrated.size };
}

export type BookLine = { title: string; slug: string; author: string; value: number };

const toLine = (b: SearchBook & { rating: number }): BookLine => ({
  title: b.title,
  slug: b.slug,
  author: b.author,
  value: b.rating,
});

/**
 * The highest and lowest Goodreads averages on the shelves. Exact 5.0s are
 * left out of the favourites: they come from a handful of votes.
 */
export function crowd(books: SearchBook[], n = 5): {
  favourites: BookLine[];
  sceptics: BookLine[];
  /** Books at exactly 5.0, left out of the favourites. */
  perfect: number;
  unrated: number;
} {
  const scored = books.filter(rated);
  const favourites = scored
    .filter((b) => b.rating < 5)
    .sort((a, b) => b.rating - a.rating || byTitle(a, b))
    .slice(0, n)
    .map(toLine);
  const sceptics = [...scored]
    .sort((a, b) => a.rating - b.rating || byTitle(a, b))
    .slice(0, n)
    .map(toLine);
  return {
    favourites,
    sceptics,
    perfect: scored.filter((b) => b.rating === 5).length,
    unrated: books.length - scored.length,
  };
}

/* ---------- 3. Who ---------- */

export type Ranked = { label: string; count: number; href: string };

function rank(values: string[], n: number, href: (v: string) => string): Ranked[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return Array.from(counts, ([label, count]) => ({ label, count, href: href(label) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, n);
}

export function topAuthors(books: SearchBook[], n = 10): {
  rows: Ranked[];
  authors: number;
  /** Authors with exactly one book here. */
  single: number;
  /** Books with no author recorded. */
  noAuthor: number;
} {
  const names = books.map((b) => b.author.trim()).filter(Boolean);
  const counts = new Map<string, number>();
  names.forEach((a) => counts.set(a, (counts.get(a) || 0) + 1));
  return {
    rows: rank(names, n, (a) => `/catalog?${new URLSearchParams({ q: a })}`),
    authors: counts.size,
    single: Array.from(counts.values()).filter((c) => c === 1).length,
    noAuthor: books.length - names.length,
  };
}

/* ---------- 4. When ---------- */

export type Column = { label: string; count: number };

/**
 * Books per decade of first publication: "Before 1900", then every decade
 * from the 1900s to the newest one, empty decades included so gaps show.
 */
export function decades(books: SearchBook[]): { rows: Column[]; noYear: number } {
  const years = books.map(firstYear).filter((y): y is number => y !== undefined);
  const rows: Column[] = [];
  if (years.length === 0) return { rows, noYear: books.length };
  rows.push({ label: 'Before 1900', count: years.filter((y) => y < 1900).length });
  const last = Math.floor(Math.max(...years) / 10) * 10;
  for (let start = 1900; start <= last; start += 10) {
    rows.push({ label: `${start}s`, count: years.filter((y) => y >= start && y < start + 10).length });
  }
  return { rows, noYear: books.length - years.length };
}

/** The value at fraction p (0–1) of a sorted list, interpolated. */
function quantile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/* ---------- 5. How long ---------- */

/** A spread of values for one genre: the median and the middle half. */
export type Spread = { tag: string; median: number; q1: number; q3: number; counted: number };

/**
 * How long each genre's books run: the median page count and the middle
 * half (25th to 75th percentile), longest genre first.
 */
export function genreLengths(books: SearchBook[]): Spread[] {
  const rows: Spread[] = [];
  for (const g of ledgerGenres(books)) {
    const pages = g.books
      .map((b) => b.pages)
      .filter((p): p is number => p !== undefined)
      .sort((a, b) => a - b);
    if (pages.length === 0) continue;
    rows.push({
      tag: g.tag,
      median: Math.round(quantile(pages, 0.5)),
      q1: Math.round(quantile(pages, 0.25)),
      q3: Math.round(quantile(pages, 0.75)),
      counted: pages.length,
    });
  }
  return rows.sort((a, b) => b.median - a.median || a.tag.localeCompare(b.tag));
}

/** Books per 100 pages, from "Under 100" to "1000+", every bin shown. */
export function lengths(books: SearchBook[]): { rows: Column[]; noPages: number } {
  const pages = books.map((b) => b.pages).filter((p): p is number => p !== undefined);
  const rows: Column[] = [{ label: 'Under 100', count: pages.filter((p) => p < 100).length }];
  for (let start = 100; start < 1000; start += 100) {
    rows.push({ label: `${start}–${start + 99}`, count: pages.filter((p) => p >= start && p < start + 100).length });
  }
  rows.push({ label: '1000+', count: pages.filter((p) => p >= 1000).length });
  return { rows, noPages: books.length - pages.length };
}

/** The longest books on the shelves. */
export function doorstops(books: SearchBook[], n = 5): BookLine[] {
  return books
    .filter((b): b is SearchBook & { pages: number } => b.pages !== undefined)
    .sort((a, b) => b.pages - a.pages || byTitle(a, b))
    .slice(0, n)
    .map((b) => ({ title: b.title, slug: b.slug, author: b.author, value: b.pages }));
}

/* ---------- 6. Firsts and lasts ---------- */

export type Extreme = { label: string; detail: string; book: SearchBook };

/** The oldest and newest by first publication, and the shortest by pages. */
export function firstsAndLasts(books: SearchBook[]): Extreme[] {
  const dated = books
    .map((book) => ({ book, year: firstYear(book) }))
    .filter((d): d is { book: SearchBook; year: number } => d.year !== undefined);
  const paged = books.filter((b): b is SearchBook & { pages: number } => b.pages !== undefined);
  const out: Extreme[] = [];

  const oldest = [...dated].sort((a, b) => a.year - b.year || byTitle(a.book, b.book))[0];
  if (oldest) out.push({ label: 'The oldest', detail: `first published ${oldest.year}`, book: oldest.book });
  const newest = [...dated].sort((a, b) => b.year - a.year || byTitle(a.book, b.book))[0];
  if (newest) out.push({ label: 'The newest', detail: `first published ${newest.year}`, book: newest.book });
  const shortest = [...paged].sort((a, b) => a.pages - b.pages || byTitle(a, b))[0];
  if (shortest) out.push({ label: 'The shortest', detail: `${shortest.pages} pages`, book: shortest });

  return out;
}

export function topSeries(books: SearchBook[], n = 10): {
  rows: Ranked[];
  series: number;
  /** Books that belong to a series. */
  inSeries: number;
} {
  const names = books.map((b) => b.series).filter((s): s is string => Boolean(s));
  return {
    rows: rank(names, n, (s) => `/catalog?${new URLSearchParams({ series: s })}`),
    series: new Set(names).size,
    inSeries: names.length,
  };
}
