import { isTypesenseConfigured } from '@/lib/typesense/client';
import { searchBooksWithTypesense } from '@/lib/typesense/search';
import { searchBooksInSanity } from './sanity';
import type { BooksSearchResponse } from './types';

export { BOOKS_TAG } from './sanity';
export * from './types';

/**
 * The one catalog search. Shared by the API route (called from the client
 * on every interaction), app/catalog/page.tsx (the SSR first paint) and
 * app/ledger/page.tsx (facet counts for its charts).
 *
 * Typesense when it's configured (TYPESENSE_HOST + TYPESENSE_API_KEY),
 * otherwise Sanity with an in-memory index. Both return the same shape, so
 * switching backends is only a matter of env vars.
 */
export function searchBooks(searchParams: URLSearchParams): Promise<BooksSearchResponse> {
  return isTypesenseConfigured
    ? searchBooksWithTypesense(searchParams)
    : searchBooksInSanity(searchParams);
}
