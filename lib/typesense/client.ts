import Typesense from 'typesense';

// Server-only. TYPESENSE_API_KEY must never be prefixed NEXT_PUBLIC_ — it's
// the admin key, and this module should only ever be imported from Route
// Handlers / Server Components, never from a 'use client' file.
const { TYPESENSE_HOST, TYPESENSE_PORT, TYPESENSE_PROTOCOL, TYPESENSE_API_KEY } = process.env;

export const isTypesenseConfigured = Boolean(TYPESENSE_HOST && TYPESENSE_API_KEY);

export const typesenseClient = isTypesenseConfigured
  ? new Typesense.Client({
      nodes: [
        {
          host: TYPESENSE_HOST!,
          port: Number(TYPESENSE_PORT) || 443,
          protocol: TYPESENSE_PROTOCOL || 'https',
        },
      ],
      apiKey: TYPESENSE_API_KEY!,
      connectionTimeoutSeconds: 5,
    })
  : null;

export const BOOKS_COLLECTION_NAME = 'books';

export const FACET_FIELDS = ['theme', 'tags', 'language', 'publishingYear'] as const;
export type FacetField = (typeof FACET_FIELDS)[number];

export interface TypesenseBookDoc {
  id: string;
  title: string;
  author: string;
  theme: string[];
  tags: string[];
  language: string[];
  publishingYear?: number;
  rating?: number;
  slug: string;
  coverUrl: string;
}
