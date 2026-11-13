// Backend-neutral search types. Safe to import from client components —
// nothing here pulls in Sanity or Typesense.

export const PAGE_SIZE = 24;

export interface FacetCount {
  value: string;
  count: number;
}

/** One book as the catalog lists it — the same shape whichever backend answered. */
export interface SearchBook {
  id: string;
  bookId?: string;
  title: string;
  author: string;
  tags: string[];
  /** Series name, tidied by cleanSeries(). */
  series?: string;
  /** Year of the edition on the shelf. */
  publishingYear?: number;
  /** Year the book first appeared. */
  originalYear?: number;
  /** Goodreads community average, 0–5. */
  rating?: number;
  /** Page count of the copy on the shelf. */
  pages?: number;
  slug: string;
  coverUrl: string;
}

/** A book plus, when a query is active, which tokens matched in which field. */
export type BookHit = SearchBook & {
  matched?: Partial<Record<'title' | 'author', string[]>>;
};

export const FACET_FIELDS = ['tags', 'author', 'publishingYear'] as const;
export type FacetField = (typeof FACET_FIELDS)[number];

export interface BooksSearchResponse {
  books: BookHit[];
  found: number;
  page: number;
  totalPages: number;
  /**
   * The OPTIONS to render for each filter — not the counts for the current
   * result set. Each field's list reflects every *other* active filter but
   * ignores its own, so selecting Fiction never hides Non-Fiction (which
   * would break multi-select) while selecting a year band does narrow the
   * tags on offer.
   */
  options: {
    tags: string[];
    series: string[];
    /** Band ids with at least one book under the other active filters. */
    bands: string[];
  };
  /**
   * Counts over the current result set, filtered by everything active. The
   * catalog doesn't use these — its filter options come from `options`
   * above, which is disjunctive. /ledger does, for its charts.
   */
  facets: Record<FacetField, FacetCount[]>;
}

export const EMPTY_RESPONSE = (page: number): BooksSearchResponse => ({
  books: [],
  found: 0,
  page,
  totalPages: 1,
  options: { tags: [], series: [], bands: [] },
  facets: { tags: [], author: [], publishingYear: [] },
});

/** URL keys the catalog filters on (multi-valued). */
export const FILTER_KEYS = ['tags', 'series', 'band'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
