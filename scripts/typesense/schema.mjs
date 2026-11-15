// Typesense collection schema for the Bibliophagist Library book catalog.
//
// Fields with filter UI get `facet: true` — CatalogBrowser filters on tags
// and year. `author` is faceted too (the old /ledger's "most-shelved authors"
// chart used it; /story now works from getAllBooks). `rating` is shown on cards but never filtered, so it's not faceted.
// Must match lib/search/types.ts (SearchBook, FACET_FIELDS).

export const BOOKS_COLLECTION_NAME = 'books';

export const booksSchema = {
  name: BOOKS_COLLECTION_NAME,
  fields: [
    { name: 'title', type: 'string' },
    { name: 'author', type: 'string', facet: true, optional: true },
    { name: 'bookId', type: 'string', optional: true, index: false },
    { name: 'tags', type: 'string[]', facet: true, optional: true },
    // Derived from the `publishingDate` string on the Sanity document — see
    // transform.mjs. `optional: true` because older entries may have no
    // parseable year at all; we don't fabricate one (see project pitfalls).
    { name: 'publishingYear', type: 'int32', facet: true, optional: true },
    { name: 'rating', type: 'float', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'coverUrl', type: 'string', optional: true },
  ],
};
