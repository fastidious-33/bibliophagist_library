import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { isSanityConfigured, sanityClient } from '@/lib/sanity/client';
import { BOOKS_TAG } from '@/lib/search';

/**
 * Whether books are on the shelf (M3 A3, M3-BORROWING.md §7). Server code
 * only; /api/availability decides how much of it each viewer sees.
 *
 * A book is on loan when its open loans plus accepted requests (set aside
 * for someone, not yet handed over) reach its copies: "Owned copies" in
 * the Studio, 1 when empty. Waiting requests don't count.
 *
 * Loans are read live; copies come from a cache, so checking availability
 * never waits on Sanity.
 */

export interface BookAvailability {
  available: boolean;
  /** The soonest due date among its open loans (YYYY-MM-DD in India), if any. */
  due: string | null;
  /** Who has it or has it set aside: only ever sent to the librarian. */
  holders: { name: string; due: string | null }[];
}

/** At most this many books per question (a page of cards, later). */
export const MAX_IDS = 50;

/**
 * The books the library owns more than one copy of, as [_id, copies]
 * pairs; every other book counts as 1. A short list, cached under the
 * `books` tag like the catalog search index (lib/search/sanity.ts): the
 * Sanity webhook (app/api/sanity-webhook) clears it whenever a book is
 * published or deleted, and it refreshes itself daily in case a webhook is
 * missed. Sanity can't reach localhost, so locally a copies change shows
 * after that daily refresh (or after deleting .next/cache and restarting).
 * A failed fetch throws rather than caching an empty list.
 */
const loadMultiCopyBooks = unstable_cache(
  async (): Promise<[string, number][]> => {
    const rows = await sanityClient!.fetch<{ _id: string; copies: number }[]>(
      `*[_type == "book" && copies > 1]{ _id, copies }`,
    );
    return rows.map((row) => [row._id, Math.floor(row.copies)]);
  },
  ['multi-copy-books'],
  { tags: [BOOKS_TAG], revalidate: 86400 },
);

/** Copies by book id, for books with more than one; any other book has 1. */
export async function copiesOf(): Promise<Map<string, number>> {
  if (!isSanityConfigured || !sanityClient) return new Map();
  try {
    return new Map(await loadMultiCopyBooks());
  } catch (error) {
    // Sanity unreachable and nothing cached yet: count every book as one
    // copy rather than failing the badge.
    console.error('Availability: could not load copies from Sanity', error);
    return new Map();
  }
}

export async function getAvailability(ids: string[]): Promise<Record<string, BookAvailability>> {
  const [copies, holders] = await Promise.all([
    copiesOf(),
    db()`
      select l.book_id, coalesce(m.name, l.member_name, 'Someone') as name,
             (l.due_at at time zone 'Asia/Kolkata')::date::text as due
      from loans l left join members m on m.id = l.member_id
      where l.returned_at is null and l.book_id = any(${ids}::text[])
      union all
      select r.book_id, m.name, null as due
      from requests r join members m on m.id = r.member_id
      where r.status = 'accepted' and r.book_id = any(${ids}::text[])
      order by due nulls last`,
  ]);

  const result: Record<string, BookAvailability> = {};
  for (const id of ids) {
    const forBook = (holders as { book_id: string; name: string; due: string | null }[]).filter(
      (h) => h.book_id === id,
    );
    const dues = forBook.map((h) => h.due).filter((d): d is string => Boolean(d));
    result[id] = {
      available: forBook.length < (copies.get(id) ?? 1),
      due: dues.length > 0 ? dues[0] : null,
      holders: forBook.map(({ name, due }) => ({ name, due })),
    };
  }
  return result;
}
