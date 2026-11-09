// Typesense collection schema for the Bibliophagist Library book catalog.
//
// Only fields with real filter UI get `facet: true` — see the project's
// CatalogBrowser, which currently filters on theme / tags / language / year.
// `rating` is shown on cards but never filtered, so it's not faceted.

export const BOOKS_COLLECTION_NAME = 'books';

export const booksSchema = {
  name: BOOKS_COLLECTION_NAME,
  fields: [
    { name: 'title', type: 'string' },
    { name: 'author', type: 'string', optional: true },
    { name: 'theme', type: 'string[]', facet: true, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true },
    { name: 'language', type: 'string[]', facet: true, optional: true },
    // Derived from the `publishingDate` string on the Sanity document — see
    // transform.mjs. `optional: true` because older entries may have no
    // parseable year at all; we don't fabricate one (see project pitfalls).
    { name: 'publishingYear', type: 'int32', facet: true, optional: true },
    { name: 'rating', type: 'float', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'coverUrl', type: 'string', optional: true },
  ],
};
