/**
 * Year bands and sort options, shared by the server (both search backends)
 * and the client (which renders them).
 *
 * The band boundaries are HARDCODED on purpose. An earlier design computed
 * them from the data — merging sparse decades — but that makes boundaries
 * move as you filter, so an option could change shape or vanish mid-click.
 * Fixed bands mean filtering only ever changes which bands are SHOWN, never
 * where they start and end.
 *
 * They're deliberately uneven: the catalog's oldest titles are 17th–19th
 * century one-offs, while most of it is recent, so precision lives where
 * the books are.
 */
export interface YearBand {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const YEAR_BANDS: YearBand[] = [
  { id: 'pre1900', label: 'Pre-1900', max: 1899 },
  { id: '1900', label: '1900–1959', min: 1900, max: 1959 },
  { id: '1960', label: '1960s–70s', min: 1960, max: 1979 },
  { id: '1980', label: '1980s', min: 1980, max: 1989 },
  { id: '1990', label: '1990s', min: 1990, max: 1999 },
  { id: '2000', label: '2000s', min: 2000, max: 2009 },
  { id: '2010', label: '2010s', min: 2010, max: 2019 },
  { id: '2020', label: '2020s', min: 2020, max: 2029 },
];

export const BAND_BY_ID = new Map(YEAR_BANDS.map((b) => [b.id, b]));

/** Which band a publication year falls into, or undefined if it's out of range. */
export function bandForYear(year: number): YearBand | undefined {
  return YEAR_BANDS.find(
    (b) => (b.min === undefined || year >= b.min) && (b.max === undefined || year <= b.max)
  );
}

export interface SortOption {
  id: string;
  label: string;
}

/**
 * Each backend maps these ids to its own ordering: lib/search/sanity.ts sorts
 * in memory, lib/typesense/search.ts turns them into sort_by clauses.
 */
export const SORT_OPTIONS: SortOption[] = [
  { id: 'relevance', label: 'Best match' },
  { id: 'rating', label: 'Highest rated on Goodreads' },
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
];

export const SORT_BY_ID = new Map(SORT_OPTIONS.map((s) => [s.id, s]));

/**
 * A series name as the catalog filters on it: inner whitespace collapsed,
 * stray spaces and trailing commas trimmed ("Poirot ," → "Poirot").
 * Undefined when nothing is left. The filter and the book page's series
 * link both use it, so the link always matches a filter option.
 */
export function cleanSeries(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
  return cleaned || undefined;
}
