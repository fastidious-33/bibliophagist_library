import type { TypesenseBookDoc } from './client';

// IMPORTANT: this is a TypeScript twin of scripts/typesense/transform.mjs
// (which runs standalone under plain Node, in the sync container and the
// manual script). Keep the field mapping identical in both places.

interface SanityBookForIndex {
  _id: string;
  bookId?: string;
  title?: string;
  author?: string;
  tags?: unknown;
  rating?: number;
  publishingDate?: string;
  slug?: string;
  coverUrl?: string;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.trim() !== '') return [value];
  return [];
}

function parseYear(publishingDate?: string): number | undefined {
  if (!publishingDate) return undefined;
  const y = publishingDate.slice(0, 4);
  return /^\d{4}$/.test(y) ? Number(y) : undefined;
}

export function bookToTypesenseDoc(book: SanityBookForIndex): TypesenseBookDoc | null {
  if (!book.slug) return null;
  const doc: TypesenseBookDoc = {
    id: book._id,
    title: book.title || '(untitled)',
    author: book.author || '',
    tags: toArray(book.tags),
    slug: book.slug,
    coverUrl: book.coverUrl || '',
  };
  if (book.bookId) doc.bookId = book.bookId;
  const year = parseYear(book.publishingDate);
  if (year !== undefined) doc.publishingYear = year;
  if (typeof book.rating === 'number') doc.rating = book.rating;
  return doc;
}
