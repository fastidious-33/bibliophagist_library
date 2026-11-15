import {
  typesenseClient,
  isTypesenseConfigured,
  BOOKS_COLLECTION_NAME,
  type TypesenseBookDoc,
} from './client';
import { YEAR_BANDS, BAND_BY_ID, bandForYear, type YearBand } from '@/lib/search/catalog-facets';
import {
  PAGE_SIZE,
  FACET_FIELDS,
  EMPTY_RESPONSE,
  type BookHit,
  type BooksSearchResponse,
  type FacetCount,
  type FacetField,
} from '@/lib/search/types';

// Not in use until Typesense is deployed (roadmap M4) — lib/search/index.ts
// picks this backend only when TYPESENSE_HOST and TYPESENSE_API_KEY are set.

const QUERY_BY = 'title,author,tags';

// The year facet is per-distinct-year, and a catalog spanning 1656–2025 can
// easily exceed 50 distinct years — truncation would silently drop sparse
// older years, making a band look empty when it isn't and under-counting
// old decades (the old /ledger read these; /story now uses getAllBooks).
const MAX_FACET_VALUES = 250;

/** Multi-select facet fields. publishingYear is handled via bands instead. */
const SELECTABLE_FIELDS = ['tags'] as const;
type SelectableField = (typeof SELECTABLE_FIELDS)[number];

const SORT_BY: Record<string, string | undefined> = {
  relevance: undefined, // Typesense's own ranking
  rating: 'rating:desc',
  newest: 'publishingYear:desc',
  oldest: 'publishingYear:asc',
};

/** A single band as a Typesense filter clause. */
function bandClause(band: YearBand): string {
  if (band.min === undefined && band.max !== undefined) return `publishingYear:<=${band.max}`;
  if (band.max === undefined && band.min !== undefined) return `publishingYear:>=${band.min}`;
  return `publishingYear:[${band.min}..${band.max}]`;
}

/** One field's clause, or undefined when nothing is selected for it. */
function fieldClause(searchParams: URLSearchParams, field: SelectableField): string | undefined {
  const values = searchParams.getAll(field);
  if (values.length === 0) return undefined;
  // Backticks so values containing spaces or commas stay one token each.
  const escaped = values.map((v) => `\`${v.replace(/`/g, '')}\``);
  return `${field}:=[${escaped.join(',')}]`;
}

/** The selected year bands as one OR'd clause. */
function bandsClause(searchParams: URLSearchParams): string | undefined {
  const ids = searchParams.getAll('band').filter((id) => BAND_BY_ID.has(id));
  if (ids.length === 0) return undefined;
  const parts = ids.map((id) => bandClause(BAND_BY_ID.get(id)!));
  return parts.length === 1 ? parts[0] : `(${parts.join(' || ')})`;
}

/**
 * Every active clause, keyed by which filter produced it — so a facet query
 * can rebuild the filter string with one key left out.
 */
function collectClauses(searchParams: URLSearchParams): Map<string, string> {
  const clauses = new Map<string, string>();
  for (const field of SELECTABLE_FIELDS) {
    const clause = fieldClause(searchParams, field);
    if (clause) clauses.set(field, clause);
  }
  const bands = bandsClause(searchParams);
  if (bands) clauses.set('band', bands);
  return clauses;
}

function joinExcept(clauses: Map<string, string>, exclude?: string): string {
  return Array.from(clauses.entries())
    .filter(([key]) => key !== exclude)
    .map(([, clause]) => clause)
    .join(' && ');
}

function facetValues(result: unknown, field: string): FacetCount[] {
  const counts = (result as { facet_counts?: { field_name: string; counts?: FacetCount[] }[] })
    ?.facet_counts;
  const match = (counts || []).find((f) => f.field_name === field);
  return (match?.counts || []).map((c) => ({ value: c.value, count: c.count }));
}

/** Roll per-year facet counts up into the band ids that actually have books. */
function bandsFromYearFacets(years: FacetCount[]): string[] {
  const present = new Set<string>();
  for (const f of years) {
    const year = Number(f.value);
    if (!Number.isInteger(year) || f.count <= 0) continue;
    const band = bandForYear(year);
    if (band) present.add(band.id);
  }
  // Preserve the canonical band order rather than insertion order.
  return YEAR_BANDS.filter((b) => present.has(b.id)).map((b) => b.id);
}

/**
 * Issues one multi_search containing the results query plus one extra
 * facet-only query per *actively filtered* field. Those extras are what
 * make the filter options disjunctive; fields with nothing selected read
 * their options straight off the main query, which is already filtered by
 * everything else and therefore already correct.
 */
export async function searchBooksWithTypesense(
  searchParams: URLSearchParams
): Promise<BooksSearchResponse> {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  if (!isTypesenseConfigured || !typesenseClient) {
    return EMPTY_RESPONSE(page);
  }

  const q = searchParams.get('q')?.trim() || '*';
  const clauses = collectClauses(searchParams);
  const sortBy = SORT_BY[searchParams.get('sort') || 'relevance'];

  const base = {
    collection: BOOKS_COLLECTION_NAME,
    q,
    query_by: QUERY_BY,
    max_facet_values: MAX_FACET_VALUES,
  };

  const mainFilter = joinExcept(clauses);
  const searches: Record<string, unknown>[] = [
    {
      ...base,
      facet_by: FACET_FIELDS.join(','),
      page,
      per_page: PAGE_SIZE,
      ...(mainFilter ? { filter_by: mainFilter } : {}),
      ...(sortBy ? { sort_by: sortBy } : {}),
    },
  ];

  // One extra query per active filter, with that filter's own clause
  // removed. per_page: 0 — we only want the facet counts back.
  const extras = Array.from(clauses.keys());
  for (const key of extras) {
    const filter = joinExcept(clauses, key);
    searches.push({
      ...base,
      facet_by: key === 'band' ? 'publishingYear' : key,
      page: 1,
      per_page: 0,
      ...(filter ? { filter_by: filter } : {}),
    });
  }

  const response = await typesenseClient.multiSearch.perform({ searches });
  const results = (response.results || []) as unknown[];
  const main = results[0] as {
    hits?: { document: TypesenseBookDoc; highlight?: Record<string, { matched_tokens?: string[] }> }[];
    found?: number;
  };

  const books: BookHit[] = (main.hits || []).map((hit) => {
    const highlight = hit.highlight || {};
    const matched: BookHit['matched'] = {};
    if (highlight.title?.matched_tokens?.length) matched.title = highlight.title.matched_tokens;
    if (highlight.author?.matched_tokens?.length) matched.author = highlight.author.matched_tokens;
    return Object.keys(matched).length > 0 ? { ...hit.document, matched } : { ...hit.document };
  });

  const found = main.found || 0;
  const totalPages = Math.max(1, Math.ceil(found / PAGE_SIZE));

  // Default each field's options to the main query's facets, then override
  // with the disjunctive result for any field that had its own filter.
  const options = {
    tags: facetValues(main, 'tags').map((f) => f.value),
    // Not indexed in Typesense yet (backlog, M4): no series filter here.
    series: [] as string[],
    bands: bandsFromYearFacets(facetValues(main, 'publishingYear')),
  };

  extras.forEach((key, i) => {
    const result = results[i + 1];
    if (!result) return;
    if (key === 'band') {
      options.bands = bandsFromYearFacets(facetValues(result, 'publishingYear'));
    } else {
      options[key as SelectableField] = facetValues(result, key).map((f) => f.value);
    }
  });

  const facets = {} as Record<FacetField, FacetCount[]>;
  for (const field of FACET_FIELDS) {
    facets[field] = facetValues(main, field);
  }

  return { books, found, page, totalPages, options, facets };
}
