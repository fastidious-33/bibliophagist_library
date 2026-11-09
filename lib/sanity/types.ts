export interface Book {
  _id: string;
  bookId?: number;
  title: string;
  slug: string;
  author?: string;
  theme?: string[];
  tags?: string[];
  language?: string[];
  rating?: number;
  publishingDate?: string; // publication year as plain text, e.g. "1966" (may also appear as "1966-01-01" from older imports — always take just the first 4 chars)
  publisher?: string;
  description?: string; // book blurb/synopsis, distinct from `notes`
  link?: string;
  coverUrl?: string;
  notes?: string; // the group's own commentary, distinct from `description`
}
