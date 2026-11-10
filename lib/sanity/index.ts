// Public entry point for everything Sanity-book-related. Split into a few
// small files (client / types / placeholder-books / queries) instead of one
// growing file, but re-exported here so existing `from '@/lib/sanity'`
// imports across the app don't need to change.
export type { Book } from './types';
export { isSanityConfigured, sanityClient } from './client';
export { BOOKS_QUERY, BOOK_COUNT_TAG, LIBRARIANS_PICK_TAG, getBooks, getBookBySlug, getBooksPreview, getLibrariansPicks, getBookCount, getStoredBookCount, getBookSlugAt, getRatingValues } from './queries';