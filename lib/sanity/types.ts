export interface Book {
  _id: string;
  bookId?: string; // the library's call number, e.g. "B669" — same as _id for imported books
  title: string;
  slug: string;
  author?: string;
  tags?: string[]; // collections and genres, e.g. Fiction, Non-Fiction, Indian Authors
  series?: string; // e.g. "Hercule Poirot"; tidy with cleanSeries() before use
  rating?: number; // the Goodreads community average, 0–5 (not shown on book pages)
  publishingDate?: string; // publication year as plain text, e.g. "1966" (may also appear as "1966-01-01" from older imports — always take just the first 4 chars)
  publisher?: string;
  description?: string; // book blurb/synopsis, distinct from `notes`
  link?: string;
  coverUrl?: string;
  notes?: string; // the librarian's notes, distinct from `description`
}
