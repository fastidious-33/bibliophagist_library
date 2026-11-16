import type { SearchBook } from '@/lib/search/types';
import { FICTION_TAG, LIBRARIANS_PICK_TAG, NON_FICTION_TAG } from '@/lib/genres/shared';
import { FAMILY_NAMES, OTHER_FAMILY, familyGenres, familyOf } from '@/lib/genres/families';

export { familyGenres };

/**
 * The numbers behind /story (PLAN.md, "The Story of the Shelves"). Pure
 * functions over a book list: the server runs them on the whole shelf, and
 * the browser runs the same ones on a selection.
 */

export const INDIAN_AUTHORS_TAG = 'Indian Authors';
export const TRANSLATED_TAG = 'Translated Works';

/* ---------- Helpers ---------- */

const fmt = (n: number) => n.toLocaleString('en-GB');
const plural = (n: number, word: string, many = `${word}s`) => `${fmt(n)} ${n === 1 ? word : many}`;
const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;

/** First-published year, else the edition's year. */
export function firstYear(book: SearchBook): number | undefined {
  return book.originalYear ?? book.publishingYear;
}

/** A Goodreads average worth counting (0 means Goodreads had none). */
function rated(book: SearchBook): book is SearchBook & { rating: number } {
  return typeof book.rating === 'number' && book.rating > 0;
}

const paged = (book: SearchBook): book is SearchBook & { pages: number } => book.pages !== undefined;

const byTitle = (a: SearchBook, b: SearchBook) => a.title.localeCompare(b.title);

/** The value at fraction p (0–1) of a sorted list, interpolated. */
function quantile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

const sortedPages = (books: SearchBook[]) =>
  books
    .filter(paged)
    .map((b) => b.pages)
    .sort((a, b) => a - b);

const medianPages = (books: SearchBook[]) => {
  const pages = sortedPages(books);
  return pages.length ? Math.round(quantile(pages, 0.5)) : undefined;
};

/* ---------- The opening line ---------- */

export type Glance = { books: number; authors: number; oldest?: number; newest?: number };

/** For the hero: how many books, by how many authors, across which years. */
export function glance(books: SearchBook[]): Glance {
  const years = books.map(firstYear).filter((y): y is number => y !== undefined);
  return {
    books: books.length,
    authors: new Set(books.map((b) => b.author.trim()).filter(Boolean)).size,
    oldest: years.length ? Math.min(...years) : undefined,
    newest: years.length ? Math.max(...years) : undefined,
  };
}

/* ---------- Selection, wings and genres ---------- */

export type Wing = 'fiction' | 'non-fiction';
export const WINGS: Wing[] = ['fiction', 'non-fiction'];
export const WING_LABEL: Record<Wing, string> = { fiction: 'Fiction', 'non-fiction': 'Non-fiction' };

/** One wing, family or genre at a time; null is the whole shelf. */
export type Selection =
  | { kind: 'genre'; genre: string }
  | { kind: 'family'; family: string }
  | { kind: 'wing'; wing: Wing }
  | null;

export function selectionLabel(selection: Selection): string {
  if (!selection) return 'The whole shelf';
  if (selection.kind === 'genre') return selection.genre;
  if (selection.kind === 'family') return selection.family;
  return WING_LABEL[selection.wing];
}

/**
 * Tags that aren't genres in the story: the wings, the pick, origins,
 * formats, moods and the catch-all. There's no threshold, and Children,
 * Young Adult and Comics count.
 */
export const NOT_STORY_GENRES = new Set([
  FICTION_TAG,
  NON_FICTION_TAG,
  LIBRARIANS_PICK_TAG,
  INDIAN_AUTHORS_TAG,
  TRANSLATED_TAG,
  'Short Stories Collection',
  'Light-Hearted',
  'Emotion-Heavy',
  'Miscellaneous',
]);

export const storyGenresOf = (book: SearchBook) => book.tags.filter((t) => !NOT_STORY_GENRES.has(t));

/** How many books carry each genre tag. */
export function genreCounts(books: SearchBook[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of books) for (const g of storyGenresOf(b)) counts.set(g, (counts.get(g) ?? 0) + 1);
  return counts;
}

/** Every genre with its book count, most books first. */
export function storyGenres(books: SearchBook[]): { tag: string; count: number }[] {
  return Array.from(genreCounts(books), ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
  );
}

/** A book's wing. The rare book tagged both counts as Fiction. */
export function wingOf(book: SearchBook): Wing | undefined {
  if (book.tags.includes(FICTION_TAG)) return 'fiction';
  if (book.tags.includes(NON_FICTION_TAG)) return 'non-fiction';
  return undefined;
}

/** Where a book sits in the wheel: one wing, one family, one genre. */
export type Placement = { wing: Wing; family: string; genre: string };

/**
 * Where a book sits in the wheel, once in each ring so they add up: under
 * its most specific subject genre (the one on the fewest books, ties
 * alphabetical) and that genre's family (lib/genres/families.ts). Audience
 * and format genres (Young Readers, Comics) only count when the book has no
 * subject genre, so a young-adult fantasy sits under Fantasy. A genre not
 * yet placed in a family goes to its wing's Other. Undefined for a book
 * with no genre tag or no wing.
 */
export function placeBook(book: SearchBook, counts: Map<string, number>): Placement | undefined {
  const wing = wingOf(book);
  const genres = storyGenresOf(book);
  if (!wing || genres.length === 0) return undefined;
  const specific = [...genres].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || a.localeCompare(b));
  const genre = specific.find((g) => !familyOf(wing, g)?.audience) ?? specific[0];
  return { wing, genre, family: familyOf(wing, genre)?.name ?? OTHER_FAMILY };
}

/**
 * The books a selection covers: every book carrying the genre, every book
 * carrying any of the family's genres (so Fantasy is all fantasy, young
 * adult included), or the wing.
 */
export function filterBooks<B extends SearchBook>(books: B[], selection: Selection): B[] {
  if (!selection) return books;
  if (selection.kind === 'genre') return books.filter((b) => b.tags.includes(selection.genre));
  if (selection.kind === 'family') {
    const genres = familyGenres(selection.family);
    return books.filter((b) => b.tags.some((t) => genres.has(t)));
  }
  return books.filter((b) => wingOf(b) === selection.wing);
}

/** Every family with books (any of its genres), for the dropdown, most books first. */
export function storyFamilies(books: SearchBook[]): { name: string; count: number }[] {
  return FAMILY_NAMES.map((name) => ({ name, count: filterBooks(books, { kind: 'family', family: name }).length }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* ---------- 2. What's on the shelves: the figures ---------- */

export type Figures = {
  books: number;
  authors: number;
  /** Median page count over the books with one. */
  medianPages?: number;
  booksWithPages: number;
  /** The busiest decade of first publication (ties go to the later one). */
  era?: { decade: number; books: number };
  /** Share of books in the Fiction wing, 0–1. */
  fictionShare: number;
};

function busiestDecade(books: SearchBook[]): Figures['era'] {
  const perDecade = new Map<number, number>();
  for (const b of books) {
    const y = firstYear(b);
    if (y === undefined) continue;
    const d = Math.floor(y / 10) * 10;
    perDecade.set(d, (perDecade.get(d) ?? 0) + 1);
  }
  let era: Figures['era'];
  for (const [decade, n] of perDecade) {
    if (!era || n > era.books || (n === era.books && decade > era.decade)) era = { decade, books: n };
  }
  return era;
}

export function figures(books: SearchBook[]): Figures {
  return {
    books: books.length,
    authors: new Set(books.map((b) => b.author.trim()).filter(Boolean)).size,
    medianPages: medianPages(books),
    booksWithPages: books.filter(paged).length,
    era: busiestDecade(books),
    fictionShare: books.length ? books.filter((b) => wingOf(b) === 'fiction').length / books.length : 0,
  };
}

/* ---------- 3. What it's made of: the wheel ---------- */

/** One genre in one family of one wing: books filed under it, and books tagged with it at all. */
export type WheelRow = { wing: Wing; family: string; genre: string; main: number; tagged: number };

/** A middle slice: a family in a wing. */
export type WheelFamily = {
  wing: Wing;
  family: string;
  /** Books filed here (each book once). */
  main: number;
  /** Books carrying any of its genres, anywhere (what selecting it shows); 0 for Other. */
  tagged: number;
  /** Other (unplaced genres) can't be selected. */
  selectable: boolean;
};

/** An outer slice: a genre, or (no genre) a family's folded "+N more". */
export type WheelSlice = {
  genre?: string;
  wing: Wing;
  family: string;
  label: string;
  /** Books filed here (each book once). */
  main: number;
  /** Books carrying the tag anywhere; 0 for a fold. */
  tagged: number;
  /** For a fold: how many genres it folds together. */
  folded: number;
};

export type Wheel = {
  /** Inner ring: books with a genre, per wing. One wing when zoomed. */
  wings: { wing: Wing; books: number }[];
  /** Middle ring, in wing order so it lines up with the inner ring. */
  families: WheelFamily[];
  /** Outer ring, in family order so it lines up with the middle ring. */
  slices: WheelSlice[];
  /** Every genre, by wing and family, for the table. */
  rows: WheelRow[];
  /** Books with no genre tag (not in the wheel). */
  untagged: number;
  /** Books with a genre but neither wing tag (not in the wheel). */
  noWing: number;
};

/** Genres drawn per family before the rest fold into "+N more" (all when a wing is opened out). */
const FAMILY_TOP = 3;

/**
 * `keep`: a genre to keep out of any "+N more" fold (the selected one), so
 * even a one-book genre gets a slice of its own to show and highlight.
 */
export function wheel(books: SearchBook[], zoom?: Wing | null, keep?: string): Wheel {
  const counts = genreCounts(books);
  const filed = new Map<string, WheelRow>();
  const wingBooks: Record<Wing, number> = { fiction: 0, 'non-fiction': 0 };
  let untagged = 0;
  let noWing = 0;

  for (const b of books) {
    if (storyGenresOf(b).length === 0) {
      untagged++;
      continue;
    }
    const place = placeBook(b, counts);
    if (!place) {
      noWing++;
      continue;
    }
    wingBooks[place.wing]++;
    const key = `${place.wing}|${place.family}|${place.genre}`;
    const row = filed.get(key);
    if (row) row.main++;
    else filed.set(key, { ...place, main: 1, tagged: counts.get(place.genre) ?? 0 });
  }

  const byMain = <T extends { main: number }>(a: T, b: T) => b.main - a.main;
  const rows = Array.from(filed.values());

  // The middle ring: each wing's families, biggest first, Other last.
  const familyTagged = new Map<string, number>();
  const tagged = (name: string) => {
    if (!familyTagged.has(name)) familyTagged.set(name, filterBooks(books, { kind: 'family', family: name }).length);
    return familyTagged.get(name)!;
  };
  const familiesIn = (wing: Wing): WheelFamily[] => {
    const totals = new Map<string, number>();
    for (const r of rows) if (r.wing === wing) totals.set(r.family, (totals.get(r.family) ?? 0) + r.main);
    return Array.from(totals, ([family, main]) => ({
      wing,
      family,
      main,
      selectable: family !== OTHER_FAMILY,
      tagged: family === OTHER_FAMILY ? 0 : tagged(family),
    })).sort(
      (a, b) =>
        Number(a.family === OTHER_FAMILY) - Number(b.family === OTHER_FAMILY) ||
        b.main - a.main ||
        a.family.localeCompare(b.family)
    );
  };

  const wings = (zoom ? [zoom] : WINGS).map((wing) => ({ wing, books: wingBooks[wing] })).filter((w) => w.books > 0);
  const families = wings.flatMap(({ wing }) => familiesIn(wing));

  // The outer ring: each family's genres, in the same order as the middle
  // ring, biggest first; past FAMILY_TOP the rest fold into "+N more"
  // (folding a single genre hides it for nothing).
  const slices = families.flatMap(({ wing, family }): WheelSlice[] => {
    const mine = rows
      .filter((r) => r.wing === wing && r.family === family)
      .sort((a, b) => byMain(a, b) || a.genre.localeCompare(b.genre));
    let shown = zoom || mine.length <= FAMILY_TOP + 1 ? mine : mine.slice(0, FAMILY_TOP);
    // The selected genre always gets its own slice, folded or not.
    const kept = keep ? mine.find((r) => r.genre === keep) : undefined;
    if (kept && !shown.includes(kept)) shown = [...shown, kept];
    const rest = mine.filter((r) => !shown.includes(r));
    const out: WheelSlice[] = shown.map((r) => ({
      genre: r.genre,
      wing,
      family,
      label: r.genre,
      main: r.main,
      tagged: r.tagged,
      folded: 0,
    }));
    if (rest.length > 0) {
      out.push({
        wing,
        family,
        label: `+${rest.length} more`,
        main: rest.reduce((s, r) => s + r.main, 0),
        tagged: 0,
        folded: rest.length,
      });
    }
    return out;
  });

  // The table: wing, then family (in ring order), then genre.
  const familyOrder = new Map(WINGS.flatMap((w) => familiesIn(w)).map((f, i) => [`${f.wing}|${f.family}`, i]));
  rows.sort(
    (a, b) =>
      (familyOrder.get(`${a.wing}|${a.family}`) ?? 0) - (familyOrder.get(`${b.wing}|${b.family}`) ?? 0) ||
      byMain(a, b) ||
      a.genre.localeCompare(b.genre)
  );

  return { wings, families, slices, rows, untagged, noWing };
}

/* ---------- 4. How the genres compare ---------- */

/** One bubble: a genre's typical length, its crowd score, and its size. */
export type Bubble = { genre: string; books: number; medianPages: number; average: number; rated: number };

/**
 * The biggest genres by books (always the whole shelf: the bubbles are a
 * selector, so a selection highlights one rather than redrawing them).
 * A genre with no page counts or no ratings can't be placed, so it's
 * skipped and the next one takes its place.
 */
export function bubbles(books: SearchBook[], n = 12): Bubble[] {
  const out: Bubble[] = [];
  for (const { tag } of storyGenres(books)) {
    if (out.length >= n) break;
    const b = bubbleFor(books, tag);
    if (b) out.push(b);
  }
  return out;
}

/** One genre's bubble, or undefined when it can't be placed (no page counts or no ratings). */
function bubbleFor(books: SearchBook[], tag: string): Bubble | undefined {
  const mine = books.filter((b) => b.tags.includes(tag));
  const pages = medianPages(mine);
  const scores = mine.filter(rated).map((b) => b.rating);
  if (pages === undefined || scores.length === 0) return undefined;
  return { genre: tag, books: mine.length, medianPages: pages, average: mean(scores), rated: scores.length };
}

/**
 * The bubbles plus the selection's genres when they aren't among them (a
 * small genre picked from the dropdown, or a family's genres), so what's
 * selected always shows. `added` names the extra bubbles; `unplaced` the
 * selected genres that can't be drawn.
 */
export function bubblesWith(
  books: SearchBook[],
  base: Bubble[],
  extras: string[]
): { rows: Bubble[]; added: string[]; unplaced: string[] } {
  const rows = [...base];
  const added: string[] = [];
  const unplaced: string[] = [];
  const counts = genreCounts(books);
  for (const tag of extras) {
    if (!counts.has(tag) || rows.some((r) => r.genre === tag)) continue;
    const b = bubbleFor(books, tag);
    if (b) {
      rows.push(b);
      added.push(tag);
    } else {
      unplaced.push(tag);
    }
  }
  return { rows, added, unplaced };
}

/** One book as a dot in a genre's drill-down: pages across, rating up. */
export type BookPoint = { title: string; slug: string; author: string; pages: number; rating: number };

/**
 * A genre's books that can be placed (they need a page count and a
 * Goodreads average), and how many couldn't.
 */
export function genreBookPoints(books: SearchBook[], genre: string): { points: BookPoint[]; left: number } {
  const mine = books.filter((b) => b.tags.includes(genre));
  const points = mine
    .filter((b): b is SearchBook & { pages: number; rating: number } => paged(b) && rated(b))
    .map((b) => ({ title: b.title, slug: b.slug, author: b.author, pages: b.pages, rating: b.rating }));
  return { points, left: mine.length - points.length };
}

/* ---------- Drill-downs: what replaces a chart when a bar is clicked ---------- */

/** The mean Goodreads average of the rated books, if any. */
export function crowdAverage(books: SearchBook[]): number | undefined {
  const scores = books.filter(rated).map((b) => b.rating);
  return scores.length ? mean(scores) : undefined;
}

/** First and last first-published years, if any. */
function yearSpan(books: SearchBook[]): { first?: number; last?: number } {
  const years = books.map(firstYear).filter((y): y is number => y !== undefined);
  return years.length ? { first: Math.min(...years), last: Math.max(...years) } : {};
}

/**
 * "1924–74" (short, so it fits a narrow ledger column), "1998–2003" across
 * a century, or just "1920" for a single year.
 */
export function spanLabel(first?: number, last?: number): string | undefined {
  if (first === undefined || last === undefined) return undefined;
  if (first === last) return String(first);
  const sameCentury = Math.floor(first / 100) === Math.floor(last / 100);
  return `${first}–${sameCentury ? String(last).slice(-2) : last}`;
}

/** One book on an author's career arc: when it came out, how it's rated. */
export type CareerPoint = { title: string; slug: string; year: number; rating: number; pages?: number };

export type AuthorDrill = {
  books: number;
  first?: number;
  last?: number;
  medianPages?: number;
  average?: number;
  /** Their books with a year and a rating, oldest first. */
  career: CareerPoint[];
  /** Their books missing a year or a rating (not on the arc). */
  unplaced: number;
};

/** One author's line in the story, from the books currently shown. */
export function authorDrill(books: SearchBook[], author: string): AuthorDrill {
  const mine = books.filter((b) => b.author.trim() === author);
  const career = mine
    .map((b) => ({ b, year: firstYear(b) }))
    .filter((d): d is { b: SearchBook & { rating: number }; year: number } => d.year !== undefined && rated(d.b))
    .map(({ b, year }) => ({ title: b.title, slug: b.slug, year, rating: b.rating, pages: b.pages }))
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  return {
    books: mine.length,
    ...yearSpan(mine),
    medianPages: medianPages(mine),
    average: crowdAverage(mine),
    career,
    unplaced: mine.length - career.length,
  };
}

/** The decade bar a year falls under, labelled as decades() labels it. */
export const decadeLabel = (year: number) => (year < 1900 ? 'Before 1900' : `${Math.floor(year / 10) * 10}s`);

/** The length bar a page count falls under, labelled as lengths() labels it. */
export function lengthLabel(pages: number): string {
  if (pages < 100) return 'Under 100';
  if (pages >= 1000) return '1000+';
  const start = Math.floor(pages / 100) * 100;
  return `${start}–${start + 99}`;
}

export const booksInDecade = (books: SearchBook[], label: string) =>
  books.filter((b) => {
    const y = firstYear(b);
    return y !== undefined && decadeLabel(y) === label;
  });

export const booksInLength = (books: SearchBook[], label: string) =>
  books.filter((b): b is SearchBook & { pages: number } => paged(b) && lengthLabel(b.pages) === label);

/** The most common genre in a set of books, leaving out one (the selected genre). */
export function mostlyGenre(books: SearchBook[], leaveOut?: string): string | undefined {
  return storyGenres(books).find((g) => g.tag !== leaveOut)?.tag;
}

/** A genre's share of a bar's books, and its share of everything shown. */
export type MixRow = { tag: string; here: number; hereShare: number; overallShare: number };

/**
 * A bar's top genres (most books first), each with its share there and its
 * share overall, so the ones the bar over- or under-indexes on show. The
 * selected genre is left out (it's in every book of a genre selection).
 */
export function genreMix(here: SearchBook[], overall: SearchBook[], leaveOut?: string, n = 6): MixRow[] {
  if (here.length === 0 || overall.length === 0) return [];
  const overallCounts = genreCounts(overall);
  return storyGenres(here)
    .filter((g) => g.tag !== leaveOut)
    .slice(0, n)
    .map((g) => ({
      tag: g.tag,
      here: g.count,
      hereShare: g.count / here.length,
      overallShare: (overallCounts.get(g.tag) ?? 0) / overall.length,
    }));
}

/** A share as "1 in 3" (or "all of them", "about half"). */
export function oneIn(share: number): string {
  if (share >= 0.995) return 'all of them';
  if (share >= 0.45 && share <= 0.55) return 'about half';
  return `1 in ${Math.max(2, Math.round(1 / share))}`;
}

/** One instalment in a series' arc. */
export type Instalment = { title: string; slug: string; year?: number; pages?: number; rating?: number };

export type SeriesDrill = {
  books: number;
  first?: number;
  last?: number;
  /** Pages of the instalments that have a count, and how many don't. */
  totalPages: number;
  noPages: number;
  favourite?: Instalment;
  /** In first-published order (there's no series-number field). */
  arc: Instalment[];
};

/** One series' line in the story, from the books currently shown. */
export function seriesDrill(books: SearchBook[], series: string): SeriesDrill {
  const mine = books
    .filter((b) => b.series === series)
    .sort((a, b) => (firstYear(a) ?? 9999) - (firstYear(b) ?? 9999) || byTitle(a, b));
  const arc: Instalment[] = mine.map((b) => ({
    title: b.title,
    slug: b.slug,
    year: firstYear(b),
    pages: b.pages,
    rating: rated(b) ? b.rating : undefined,
  }));
  const favourite = arc
    .filter((i) => i.rating !== undefined)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title))[0];
  return {
    books: mine.length,
    ...yearSpan(mine),
    totalPages: mine.filter(paged).reduce((s, b) => s + b.pages, 0),
    noPages: mine.filter((b) => !paged(b)).length,
    favourite,
    arc,
  };
}

export type BookLine = { title: string; slug: string; author: string; value: number };

const toLine = (b: SearchBook & { rating: number }): BookLine => ({
  title: b.title,
  slug: b.slug,
  author: b.author,
  value: b.rating,
});

/**
 * The highest and lowest Goodreads averages. Exact 5.0s are left out of
 * the favourites: they come from a handful of votes. A small selection
 * gets shorter lists, so the same book is never both.
 */
export function crowd(books: SearchBook[], n = 5): {
  favourites: BookLine[];
  sceptics: BookLine[];
  /** Books at exactly 5.0, left out of the favourites. */
  perfect: number;
  unrated: number;
} {
  const scored = books.filter(rated);
  const size = Math.min(n, Math.floor(scored.length / 2));
  const favourites = scored
    .filter((b) => b.rating < 5)
    .sort((a, b) => b.rating - a.rating || byTitle(a, b))
    .slice(0, size)
    .map(toLine);
  const sceptics = [...scored]
    .sort((a, b) => a.rating - b.rating || byTitle(a, b))
    .slice(0, size)
    .map(toLine);
  return {
    favourites,
    sceptics,
    perfect: scored.filter((b) => b.rating === 5).length,
    unrated: books.length - scored.length,
  };
}

/* ---------- 5. Who wrote them ---------- */

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

/* ---------- 6 and 7. The histograms ---------- */

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

/** Books per 100 pages, from "Under 100" to "1000+", every bin shown. */
export function lengths(books: SearchBook[]): { rows: Column[]; noPages: number } {
  const pages = sortedPages(books);
  const rows: Column[] = [{ label: 'Under 100', count: pages.filter((p) => p < 100).length }];
  for (let start = 100; start < 1000; start += 100) {
    rows.push({ label: `${start}–${start + 99}`, count: pages.filter((p) => p >= start && p < start + 100).length });
  }
  rows.push({ label: '1000+', count: pages.filter((p) => p >= 1000).length });
  return { rows, noPages: books.length - pages.length };
}

/** A histogram bin for the whole shelf and, with a selection, for it too. */
export type OverlayRow = { label: string; all: number; chosen?: number };

/**
 * Lines the selection's bins up with the whole shelf's (the shelf's bins
 * always cover the selection's). Without a selection, `chosen` is absent.
 */
export function overlay(all: Column[], chosen?: Column[]): OverlayRow[] {
  const mine = new Map(chosen?.map((c) => [c.label, c.count]));
  return all.map((c) => ({ label: c.label, all: c.count, chosen: chosen ? (mine.get(c.label) ?? 0) : undefined }));
}

/* ---------- 6 and 7. The books beside them ---------- */

export type Dated = { book: SearchBook; year: number };

/** The oldest and newest by first publication. */
export function oldestAndNewest(books: SearchBook[]): { oldest?: Dated; newest?: Dated } {
  const dated = books
    .map((book) => ({ book, year: firstYear(book) }))
    .filter((d): d is Dated => d.year !== undefined);
  return {
    oldest: [...dated].sort((a, b) => a.year - b.year || byTitle(a.book, b.book))[0],
    newest: [...dated].sort((a, b) => b.year - a.year || byTitle(a.book, b.book))[0],
  };
}

/** The longest books, longest first (the whole shelf's, or one length bar's). */
export function longestBooks(books: SearchBook[], n = 10): (SearchBook & { pages: number })[] {
  return books
    .filter(paged)
    .sort((a, b) => b.pages - a.pages || byTitle(a, b))
    .slice(0, n);
}

/** The slimmest book with a page count. */
export function slimmest(books: SearchBook[]): (SearchBook & { pages: number }) | undefined {
  return books.filter(paged).sort((a, b) => a.pages - b.pages || byTitle(a, b))[0];
}

/* ---------- The chapter commentary ---------- */

export type Commentary = {
  shelves: string;
  madeOf: string;
  compare: string;
  who: string;
  when: string;
  length: string;
};

const percent = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`;

const joinList = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * One short paragraph per chapter about the whole library, worked out from
 * the books themselves so it can't drift from the charts beneath it. (The
 * live line under each paragraph speaks for the current selection.)
 */
export function commentary(books: SearchBook[]): Commentary {
  if (books.length === 0) {
    const none = 'There are no books on the shelves yet.';
    return { shelves: none, madeOf: none, compare: none, who: none, when: none, length: none };
  }

  const f = figures(books);

  const shelves = `About ${Math.round(f.fictionShare * 100)}% of these ${fmt(books.length)} books are fiction${
    f.era ? `, and the busiest decade of first publication is the ${f.era.decade}s` : ''
  }.`;

  // The biggest families, counting each book once (as the wheel's middle
  // ring does), a family's two wings together.
  const familyBooks = new Map<string, number>();
  for (const f of wheel(books).families) {
    if (f.selectable) familyBooks.set(f.family, (familyBooks.get(f.family) ?? 0) + f.main);
  }
  const topFamilies = Array.from(familyBooks, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3);
  const genreTotal = storyGenres(books).length;
  const madeOf = topFamilies.length
    ? `The biggest families are ${joinList(topFamilies.map((f) => `${f.name} (${fmt(f.count)})`))}; the shelves hold ${plural(
        genreTotal,
        'genre'
      )} across ${plural(familyBooks.size, 'family', 'families')}.`
    : 'None of the books has a genre tag yet.';

  const bubbled = bubbles(books);
  let compare = 'Too few genres have page counts and ratings to compare yet.';
  if (bubbled.length >= 2) {
    const byRating = [...bubbled].sort((a, b) => b.average - a.average);
    const high = byRating[0];
    const low = byRating[byRating.length - 1];
    const longest = [...bubbled].sort((a, b) => b.medianPages - a.medianPages)[0];
    compare = `Of the ${bubbled.length} biggest genres, ${high.genre} is rated highest (${high.average.toFixed(2)}) and ${low.genre} lowest (${low.average.toFixed(2)}), a gap of ${(high.average - low.average).toFixed(2)}. ${longest.genre} runs longest, at a typical ${fmt(longest.medianPages)} pages.`;
  }

  const people = topAuthors(books, 1);
  const lead = people.rows[0];
  const inSeries = topSeries(books, 1).inSeries;
  const who = people.authors
    ? `${percent(people.single, people.authors)} of the ${fmt(people.authors)} authors have just one book here${
        lead && lead.count > 1 ? `; ${lead.label} has the most, with ${plural(lead.count, 'book')}` : ''
      }. ${inSeries ? `${plural(inSeries, 'book')} ${inSeries === 1 ? 'belongs' : 'belong'} to a series.` : 'None of the books is in a series.'}`
    : 'No author is on file for these books.';

  const years = books.map(firstYear).filter((y): y is number => y !== undefined);
  const { oldest } = oldestAndNewest(books);
  const recent = years.filter((y) => y >= 2000).length;
  const when =
    years.length && oldest
      ? `${percent(recent, years.length)} of the books with a year on file were first published in 2000 or later; the oldest is ${oldest.book.title} (${oldest.year}).`
      : 'No first-published years are on file yet.';

  const pages = sortedPages(books);
  const longestBook = longestBooks(books, 1)[0];
  const length =
    pages.length && longestBook
      ? `A typical book runs ${fmt(Math.round(quantile(pages, 0.5)))} pages and ${percent(
          pages.filter((p) => p >= 200 && p <= 400).length,
          pages.length
        )} land between 200 and 400; the longest, ${longestBook.title}, runs ${fmt(longestBook.pages)}.`
      : 'No page counts are on file yet.';

  return { shelves, madeOf, compare, who, when, length };
}

/* ---------- The live lines ---------- */

/**
 * One sentence per chapter on the selection (or the whole shelf), for under
 * the commentary. Each says what that chapter's charts say, in words.
 */
export function liveLines(books: SearchBook[], selection: Selection): {
  madeOf: string;
  compare: string;
  who: string;
  when: string;
  length: string;
} {
  const label = selectionLabel(selection);
  if (books.length === 0) {
    const none = `${label}: no books on the shelves yet.`;
    return { madeOf: none, compare: none, who: none, when: none, length: none };
  }
  const median = medianPages(books);
  const scored = books.filter(rated);
  const crowdScore = scored.length ? mean(scored.map((b) => b.rating)).toFixed(2) : undefined;

  const madeOf = [plural(books.length, 'book')];
  if (median !== undefined) madeOf.push(`a typical one runs ${fmt(median)} pages`);
  if (crowdScore) madeOf.push(`the crowd gives it ${crowdScore}`);

  const fav = crowd(books, 1).favourites[0];
  const compare = crowdScore
    ? `${label}: the crowd gives it ${crowdScore} across ${plural(scored.length, 'rated book')}${fav ? `; its favourite is ${fav.title} at ${fav.value.toFixed(2)}` : ''}.`
    : `${label}: none of these books has a Goodreads rating yet.`;

  const people = topAuthors(books, 1);
  const series = topSeries(books, 1);
  const lead = people.rows[0];
  const who = `${label}: ${plural(people.authors, 'author')}${lead && lead.count > 1 ? `, led by ${lead.label} with ${plural(lead.count, 'book')}` : ''}; ${series.inSeries ? `${plural(series.inSeries, 'book')} in a series` : 'no series'}.`;

  const era = busiestDecade(books);
  const { oldest, newest } = oldestAndNewest(books);
  const span =
    oldest && newest
      ? oldest.year === newest.year
        ? `first published in ${oldest.year}`
        : `first published between ${oldest.year} and ${newest.year}`
      : 'no first-published years on file';
  const when = era && era.books > 1 ? `${label}: busiest in the ${era.decade}s, ${span}.` : `${label}: ${span}.`;

  const longest = longestBooks(books, 1)[0];
  const length =
    median !== undefined && longest
      ? `${label}: a typical one runs ${fmt(median)} pages; the longest, ${longest.title}, runs ${fmt(longest.pages)}.`
      : `${label}: no page counts on file.`;

  return { madeOf: `${label}: ${madeOf.join(', ')}.`, compare, who, when, length };
}
