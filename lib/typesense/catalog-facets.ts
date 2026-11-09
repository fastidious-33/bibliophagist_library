/**
 * Year bands and sort options, shared by the server (which turns them into
 * Typesense filter clauses) and the client (which renders them).
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

/** A single band as a Typesense filter clause. */
export function bandClause(band: YearBand): string {
  if (band.min === undefined && band.max !== undefined) return `publishingYear:<=${band.max}`;
  if (band.max === undefined && band.min !== undefined) return `publishingYear:>=${band.min}`;
  return `publishingYear:[${band.min}..${band.max}]`;
}

export interface SortOption {
  id: string;
  label: string;
  /** Omitted for relevance — Typesense's own default ranking. */
  sortBy?: string;
}

/**
 * NOTE: there's no "recently added" option because the Typesense schema has
 * no created-at field. Adding one means changing scripts/typesense/schema.mjs,
 * and schema changes only take effect when the collection is recreated —
 * which runFullSync currently doesn't do (it creates-if-missing, then
 * upserts). So that option is blocked behind the truncate fix.
 */
export const SORT_OPTIONS: SortOption[] = [
  { id: 'relevance', label: 'Best match' },
  { id: 'rating', label: 'Highest rated', sortBy: 'rating:desc' },
  { id: 'newest', label: 'Newest first', sortBy: 'publishingYear:desc' },
  { id: 'oldest', label: 'Oldest first', sortBy: 'publishingYear:asc' },
];

export const SORT_BY_ID = new Map(SORT_OPTIONS.map((s) => [s.id, s]));
