import { copiesOf } from '@/lib/availability';
import { db } from '@/lib/db';
import type { MemberStatus } from '@/lib/members';

/**
 * The waitlist (PLAN.md "Account and desk rework"): a line per book that's
 * out. Active members join from the book's page, up to MAX_WAITLISTS books
 * each, not counted against their book limit. First come, first served;
 * the librarian can reorder (B4). Server code only; callers have already
 * found the signed-in member. Table in db/schema.sql.
 */

export const MAX_WAITLISTS = 5;

export interface WaitlistPlace {
  book_id: string;
  book_title: string;
  /** 1 = first in line. Paused members ahead still count: they keep their place. */
  place: number;
  created_at: string;
}

/**
 * A member's places in line, oldest first. A query (not yet run), so
 * callers can fold it into their own transaction. Ties on `place` (two
 * joining at the same moment) go to whoever joined first.
 */
export function waitlistPlacesQuery(memberId: string) {
  return db()`
    select w.book_id, w.book_title, w.created_at,
           (select count(*) from waitlist o
            where o.book_id = w.book_id and (o.place, o.created_at) < (w.place, w.created_at))::int + 1 as place
    from waitlist w
    where w.member_id = ${memberId}
    order by w.created_at`;
}

/**
 * Join the end of a book's line. The cap check and the insert are one
 * statement, so two quick joins can't both slip under it.
 * - `joined`: in line;
 * - `already`: they were already in this line;
 * - `full`: they're on MAX_WAITLISTS lines already.
 */
export async function joinWaitlist(
  memberId: string,
  book: { id: string; title: string },
): Promise<'joined' | 'already' | 'full'> {
  const sql = db();
  const rows = await sql`
    insert into waitlist (member_id, book_id, book_title, place)
    select ${memberId}::uuid, ${book.id}::text, ${book.title}::text,
           coalesce((select max(place) from waitlist where book_id = ${book.id}::text), 0) + 1
    where (select count(*) from waitlist where member_id = ${memberId}::uuid) < ${MAX_WAITLISTS}
    on conflict (member_id, book_id) do nothing
    returning id`;
  if (rows.length > 0) return 'joined';

  const mine = await sql`
    select 1 from waitlist where member_id = ${memberId} and book_id = ${book.id} limit 1`;
  return mine.length > 0 ? 'already' : 'full';
}

/** Leave a book's line. Leaving is always allowed. */
export async function leaveWaitlist(memberId: string, bookId: string): Promise<void> {
  await db()`delete from waitlist where member_id = ${memberId} and book_id = ${bookId}`;
}

// ---------- The desk's side (B4) ----------
// Every caller below has already checked librarian().

/** Someone in a book's line, as the desk sees them. */
export interface LineEntry {
  /** The waitlist row. */
  id: string;
  member_id: string;
  name: string;
  status: MemberStatus;
  card_no: number | null;
  phone: string;
  email: string;
  created_at: string;
}

/** One book's line, in order, and whether a copy is on the shelf. */
export interface Line {
  book_id: string;
  book_title: string;
  entries: LineEntry[];
  /** Copies out on loan or set aside for someone, against copies owned. */
  on_shelf: boolean;
  /** The soonest due date of its open loans, if any. */
  due_at: string | null;
  /** When it last came back, if ever. */
  last_returned: string | null;
}

/**
 * Every waitlist row with what the desk needs, in line order. A query (not
 * yet run), so the inbox can fold it into its transaction; group it with
 * groupLines().
 */
export function waitlistRowsQuery() {
  return db()`
    select w.id, w.book_id, w.book_title, w.created_at,
           m.id as member_id, m.name, m.status, m.card_no, m.phone, m.email,
           ((select count(*) from loans l where l.book_id = w.book_id and l.returned_at is null)
            + (select count(*) from requests r
               where r.book_id = w.book_id and r.status = 'accepted'))::int as taken,
           (select min(l.due_at) from loans l
            where l.book_id = w.book_id and l.returned_at is null) as due_at,
           (select max(l.returned_at) from loans l where l.book_id = w.book_id) as last_returned
    from waitlist w join members m on m.id = w.member_id
    order by w.book_title, w.book_id, w.place, w.created_at`;
}

/** The rows of waitlistRowsQuery as lines, given copies owned by book id (1 when missing). */
export function groupLines(rows: Record<string, unknown>[], copies: Map<string, number>): Line[] {
  const lines = new Map<string, Line>();
  for (const row of rows) {
    const bookId = row.book_id as string;
    let line = lines.get(bookId);
    if (!line) {
      line = {
        book_id: bookId,
        book_title: row.book_title as string,
        entries: [],
        on_shelf: (row.taken as number) < (copies.get(bookId) ?? 1),
        due_at: row.due_at ? new Date(row.due_at as string).toISOString() : null,
        last_returned: row.last_returned ? new Date(row.last_returned as string).toISOString() : null,
      };
      lines.set(bookId, line);
    }
    line.entries.push({
      id: row.id as string,
      member_id: row.member_id as string,
      name: row.name as string,
      status: row.status as MemberStatus,
      card_no: (row.card_no as number | null) ?? null,
      phone: row.phone as string,
      email: row.email as string,
      created_at: new Date(row.created_at as string).toISOString(),
    });
  }
  return [...lines.values()];
}

/** Every line, for the desk's Waitlist page: books by title, people in order. */
export async function getWaitlists(): Promise<Line[]> {
  const [rows, copies] = await Promise.all([waitlistRowsQuery(), copiesOf()]);
  return groupLines(rows as Record<string, unknown>[], copies);
}

/**
 * Who to suggest when a waited-for book is on the shelf: the first in line
 * who can borrow. Someone paused is skipped but keeps their place.
 */
export function firstEligible(line: Line): LineEntry | null {
  return line.entries.find((entry) => entry.status === 'active') ?? null;
}

/**
 * Set the book aside for someone in its line: their place becomes an
 * accepted request with the usual pickup window (in person; the handover
 * can change when lending), in one statement. Returns who and what (for
 * the "It's back for you" email), or null if they'd already left the line.
 */
export async function setAsideFromLine(
  waitId: string,
  days: number,
): Promise<{ book_id: string; book_title: string; set_aside_until: string; name: string; email: string } | null> {
  const rows = await db()`
    with w as (
      delete from waitlist where id = ${waitId}
      returning member_id, book_id, book_title
    ), made as (
      insert into requests (member_id, book_id, book_title, status, handover, decided_at, set_aside_until)
      select member_id, book_id, book_title, 'accepted', 'in_person', now(),
             ((((now() at time zone 'Asia/Kolkata')::date + ${days}::int) + time '23:59:59')
              at time zone 'Asia/Kolkata')
      from w
      returning member_id, book_id, book_title, set_aside_until
    )
    select made.book_id, made.book_title, made.set_aside_until, m.name, m.email
    from made join members m on m.id = made.member_id`;
  return (rows[0] as { book_id: string; book_title: string; set_aside_until: string; name: string; email: string } | undefined) ?? null;
}

/** The book a waitlist row is for, if the row still exists. */
export async function lineBookOf(waitId: string): Promise<string | null> {
  const rows = await db()`select book_id from waitlist where id = ${waitId}`;
  return (rows[0] as { book_id: string } | undefined)?.book_id ?? null;
}

/**
 * Move someone one place up or down their book's line, swapping with the
 * neighbour. The line is renumbered 1, 2, 3… as it's saved, so ties from
 * people joining at the same moment can't make a move do nothing.
 */
export async function moveInLine(waitId: string, direction: 'up' | 'down'): Promise<boolean> {
  const sql = db();
  const ids = (
    (await sql`
      select w.id from waitlist w
      where w.book_id = (select book_id from waitlist where id = ${waitId})
      order by w.place, w.created_at`) as { id: string }[]
  ).map((row) => row.id);
  const at = ids.indexOf(waitId);
  const to = direction === 'up' ? at - 1 : at + 1;
  if (at < 0 || to < 0 || to >= ids.length) return false;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  await sql.transaction(ids.map((id, index) => sql`update waitlist set place = ${index + 1} where id = ${id}`));
  return true;
}

/** Take someone out of a line (the desk's "Remove"). */
export async function removeFromLine(waitId: string): Promise<boolean> {
  const rows = await db()`delete from waitlist where id = ${waitId} returning id`;
  return rows.length > 0;
}
