import { copiesOf } from '@/lib/availability';
import { db } from '@/lib/db';
import { searchBooks, type BookChoice } from '@/lib/desk-loans';
import { listMembers, type MemberRow } from '@/lib/desk-members';

/**
 * The desk's search box (PLAN.md "Account and desk rework", B4): members
 * by name, email, phone or card number (every stage), and books by title
 * or call number with where each one is: out with whom, set aside for
 * whom, or on the shelf, and how many are waiting. Books come from the
 * catalog's cached list (no Sanity read); the rest is one round trip.
 * Server code only; callers have already checked librarian().
 */

export interface BookWhere extends BookChoice {
  /** Open loans: who has it, until when. */
  out: { member_id: string | null; name: string; due_at: string }[];
  /** Set aside for: who, until when. */
  setAside: { member_id: string; name: string; until: string | null }[];
  waiting: number;
  onShelf: boolean;
}

export interface DeskSearch {
  members: MemberRow[];
  books: BookWhere[];
}

export async function searchDesk(query: string): Promise<DeskSearch> {
  const term = query.trim().slice(0, 100);
  if (!term) return { members: [], books: [] };

  const [members, found] = await Promise.all([listMembers(term, 'all', 20), searchBooks(term)]);
  if (found.length === 0) return { members, books: [] };

  const ids = found.map((book) => book._id);
  const sql = db();
  const [loans, setAsides, waiting] = await sql.transaction(
    [
      sql`
        select l.book_id, m.id as member_id, coalesce(m.name, l.member_name, 'Someone') as name, l.due_at
        from loans l left join members m on m.id = l.member_id
        where l.returned_at is null and l.book_id = any(${ids}::text[])
        order by l.due_at`,
      sql`
        select r.book_id, m.id as member_id, m.name, r.set_aside_until as until
        from requests r join members m on m.id = r.member_id
        where r.status = 'accepted' and r.book_id = any(${ids}::text[])`,
      sql`
        select book_id, count(*)::int as waiting
        from waitlist where book_id = any(${ids}::text[])
        group by book_id`,
    ],
    { readOnly: true },
  );
  const copies = await copiesOf();

  type LoanRow = { book_id: string; member_id: string | null; name: string; due_at: string };
  type HeldRow = { book_id: string; member_id: string; name: string; until: string | null };
  type LineRow = { book_id: string; waiting: number };

  const books = found.map((book): BookWhere => {
    const out = (loans as LoanRow[]).filter((row) => row.book_id === book._id);
    const held = (setAsides as HeldRow[]).filter((row) => row.book_id === book._id);
    const line = (waiting as LineRow[]).find((row) => row.book_id === book._id);
    return {
      ...book,
      out: out.map(({ member_id, name, due_at }) => ({ member_id, name, due_at })),
      setAside: held.map(({ member_id, name, until }) => ({ member_id, name, until })),
      waiting: line?.waiting ?? 0,
      onShelf: out.length + held.length < (copies.get(book._id) ?? 1),
    };
  });
  return { members, books };
}
