import { isTypesenseConfigured } from '@/lib/typesense/client';
import { searchBooksWithTypesense } from '@/lib/typesense/search';
import { searchBooksInSanity } from './sanity';
import type { BooksSearchResponse } from './types';

// getAllBooks reads Sanity's cached list whichever backend searches; the
// ledger needs every book, not a page of results.
export { BOOKS_TAG, getAllBooks } from './sanity';
export * from './types';

/**
 * The one catalog search. Shared by the API route (called from the client
 * on every interaction) and app/catalog/page.tsx (the SSR first paint).
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
