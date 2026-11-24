import { db } from '@/lib/db';
import { waitlistPlacesQuery, type WaitlistPlace } from '@/lib/waitlist';

/**
 * Members asking for books (M3 A3, M3-BORROWING.md §5): what they already
 * hold, sending a request, and cancelling one. Server code only; callers
 * have already found the signed-in member.
 */

/**
 * Books at once, counting open requests and books out together (§3). Each
 * member has their own limit (`members.borrow_limit`); this is the usual
 * one, for pages that speak to everyone.
 */
export const DEFAULT_BORROW_LIMIT = 2;

/** What a member holds: open requests (waiting or accepted) and books out. */
export interface Holdings {
  /** How many count towards their limit. */
  open: number;
  /** Their own book limit. */
  limit: number;
  /** Each held book's id, and whether it's asked for or out with them. */
  books: { book_id: string; kind: 'request' | 'loan' }[];
  /** Their places in line (waitlists don't count towards the limit). */
  waiting: WaitlistPlace[];
}

/** One round trip: the reads run as one read-only transaction. */
export async function getHoldings(memberId: string): Promise<Holdings> {
  const sql = db();
  const [books, limits, waiting] = await sql.transaction(
    [
      sql`
        select book_id, 'request' as kind from requests
        where member_id = ${memberId} and status in ('requested', 'accepted')
        union all
        select book_id, 'loan' as kind from loans
        where member_id = ${memberId} and returned_at is null`,
      sql`select borrow_limit from members where id = ${memberId}`,
      waitlistPlacesQuery(memberId),
    ],
    { readOnly: true },
  );
  const limit = (limits[0] as { borrow_limit: number } | undefined)?.borrow_limit ?? DEFAULT_BORROW_LIMIT;
  return {
    open: books.length,
    limit,
    books: books as Holdings['books'],
    waiting: waiting as WaitlistPlace[],
  };
}

export interface NewRequest {
  bookId: string;
  bookTitle: string;
  handover: 'in_person' | 'courier';
  courierAddress: string | null;
  note: string | null;
}

/**
 * Store a request, but only while the member is under their own book
 * limit: the count and the insert are one statement, so two quick requests
 * can't both slip under it. `limit` if they're at it.
 */
export async function createRequest(memberId: string, r: NewRequest): Promise<'sent' | 'limit'> {
  const rows = await db()`
    insert into requests (member_id, book_id, book_title, handover, courier_address, member_note)
    select ${memberId}::uuid, ${r.bookId}::text, ${r.bookTitle}::text, ${r.handover}::text,
           ${r.handover === 'courier' ? r.courierAddress : null}::text, ${r.note}::text
    where (select count(*) from requests
           where member_id = ${memberId}::uuid and status in ('requested', 'accepted'))
        + (select count(*) from loans
           where member_id = ${memberId}::uuid and returned_at is null)
        < (select borrow_limit from members where id = ${memberId}::uuid)
    returning id`;
  return rows.length > 0 ? 'sent' : 'limit';
}

/**
 * A member cancels their own request, while it's still waiting (§5: once
 * you've accepted it, they ask you instead). Any courier address goes.
 */
export async function cancelOwnRequest(memberId: string, requestId: string): Promise<boolean> {
  const rows = await db()`
    update requests set status = 'cancelled', decided_at = now(), courier_address = null
    where id = ${requestId} and member_id = ${memberId} and status = 'requested'
    returning id`;
  return rows.length > 0;
}
