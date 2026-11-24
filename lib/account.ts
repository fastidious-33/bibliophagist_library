import { db } from '@/lib/db';
import { changeRequestsClosed, recentChangeDecisions, type DetailValues } from '@/lib/members';
import { waitlistPlacesQuery, type WaitlistPlace } from '@/lib/waitlist';

/**
 * What /account shows under a member's card (M3 A1c-2): their payments,
 * open requests, books out and past loans. Server code only; every query is
 * scoped to the one member id the page got from the signed-in login.
 */

/** The default amounts (M3-BORROWING.md §6), shown before anything is marked. */
export const DEPOSIT_AMOUNT = 500;
export const SUBSCRIPTION_AMOUNT = 300;

/** Shown on /account while an approved member still has a payment to make. */
export const UPI_ID = process.env.UPI_ID?.trim() ?? '';

export type PaymentKind = 'deposit' | 'subscription';

export interface Payment {
  kind: PaymentKind;
  amount: number;
  status: 'paid' | 'waived' | 'refunded';
  method: 'upi' | 'cash' | 'other' | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
}

export interface OpenRequest {
  id: string;
  book_id: string;
  book_title: string;
  /** accepted = set aside for them, waiting for pickup. */
  status: 'requested' | 'accepted';
  handover: 'in_person' | 'courier';
  created_at: string;
  /** The end of the pickup window, once accepted. */
  set_aside_until: string | null;
}

/** A request that ended in the last ENDED_REQUEST_MONTHS: cancelled, declined or released. */
export interface EndedRequest {
  id: string;
  book_id: string;
  book_title: string;
  status: 'cancelled' | 'declined' | 'released';
  /** The librarian's note, if declined. */
  note: string | null;
  decided_at: string;
}

/** Ended requests stay on /account this long, then drop off. */
export const ENDED_REQUEST_MONTHS = 3;

/** Their latest "Ask for more time" on a book out. */
export interface MoreTimeAsk {
  extra: string;
  status: 'pending' | 'approved' | 'declined';
  librarian_note: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  book_id: string;
  book_title: string;
  lent_at: string;
  due_at: string;
  returned_at: string | null;
  extended_count: number;
  /** How many times they've asked for more time on this loan. */
  asks: number;
  last_ask: MoreTimeAsk | null;
}

/** A request to change their details (detail_changes). */
export interface DetailsChange {
  new_values: Partial<DetailValues>;
  member_note: string | null;
  status: 'pending' | 'approved' | 'declined';
  librarian_note: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface AccountRecords {
  /** Their latest change request: the pending one if any, else the latest decided. */
  change: DetailsChange | null;
  /** Three declines in a row: "Request a change" is closed until the librarian re-opens it. */
  changesClosed: boolean;
  /** At most one per kind: the current payment, or else the latest refund. */
  payments: Payment[];
  requests: OpenRequest[];
  /** Ended in the last ENDED_REQUEST_MONTHS, most recent first. */
  endedRequests: EndedRequest[];
  /** Not yet returned, soonest due first. */
  loansOut: Loan[];
  /** Returned, most recent first. */
  history: Loan[];
  /** Their places in line, oldest first. */
  waitlist: WaitlistPlace[];
  /** Every loan they've had, out or returned, and when the first began. */
  stats: { borrowed: number; since: string | null };
}

/** One round trip to the database: the reads run as one read-only transaction. */
export async function getAccountRecords(memberId: string): Promise<AccountRecords> {
  const sql = db();
  const [payments, requests, ended, loans, changes, decisions, waitlist] = await sql.transaction(
    [
      // A member can have refunded deposits on record plus one current
      // payment of each kind (db/schema.sql): take the current one, or the
      // latest refund if there's nothing current.
      sql`
        select distinct on (kind) kind, amount, status, method, paid_at, refunded_at, refund_amount
        from payments
        where member_id = ${memberId}
        order by kind, (status = 'refunded'), created_at desc`,
      sql`
        select id, book_id, book_title, status, handover, created_at, set_aside_until
        from requests
        where member_id = ${memberId} and status in ('requested', 'accepted')
        order by created_at desc`,
      sql`
        select id, book_id, book_title, status, note, decided_at
        from requests
        where member_id = ${memberId} and status in ('cancelled', 'declined', 'released')
          and decided_at > now() - make_interval(months => ${ENDED_REQUEST_MONTHS})
        order by decided_at desc`,
      sql`
        select l.id, l.book_id, l.book_title, l.lent_at, l.due_at, l.returned_at, l.extended_count,
               (select count(*) from more_time_asks a where a.loan_id = l.id)::int as asks,
               (select json_build_object('extra', a.extra, 'status', a.status,
                                         'librarian_note', a.librarian_note, 'created_at', a.created_at)
                from more_time_asks a where a.loan_id = l.id
                order by a.created_at desc limit 1) as last_ask
        from loans l
        where l.member_id = ${memberId}
        order by l.returned_at desc nulls first, l.due_at asc`,
      sql`
        select new_values, member_note, status, librarian_note, created_at, decided_at
        from detail_changes
        where member_id = ${memberId}
        order by (status = 'pending') desc, decided_at desc nulls last
        limit 1`,
      recentChangeDecisions(memberId),
      waitlistPlacesQuery(memberId),
    ],
    { readOnly: true },
  );

  const allLoans = loans as Loan[];
  const firstLent = allLoans.reduce<string | null>(
    (first, loan) =>
      first === null || new Date(loan.lent_at).getTime() < new Date(first).getTime() ? loan.lent_at : first,
    null,
  );
  return {
    change: (changes[0] as DetailsChange | undefined) ?? null,
    changesClosed: changeRequestsClosed(decisions),
    payments: payments as Payment[],
    requests: requests as OpenRequest[],
    endedRequests: ended as EndedRequest[],
    loansOut: allLoans.filter((loan) => !loan.returned_at),
    history: allLoans.filter((loan) => loan.returned_at),
    waitlist: waitlist as WaitlistPlace[],
    stats: { borrowed: allLoans.length, since: firstLent },
  };
}
