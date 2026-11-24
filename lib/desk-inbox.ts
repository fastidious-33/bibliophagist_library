import { copiesOf } from '@/lib/availability';
import { db } from '@/lib/db';
import type { SignUp } from '@/lib/desk';
import { syncPauses } from '@/lib/desk-loans';
import { purgeDeclined } from '@/lib/desk-members';
import type { DetailValues, MemberStatus } from '@/lib/members';
import { firstEligible, groupLines, waitlistRowsQuery, type Line, type LineEntry } from '@/lib/waitlist';

/**
 * The desk's inbox (PLAN.md "Account and desk rework", B3): only what waits
 * on the librarian. Sign-ups, payments due, book requests (grouped by
 * person), books set aside and not yet collected (from day 7: "nudge?"; on
 * the last day: "release?"), overdue books, change requests, "more time"
 * asks, and waited-for books back on the shelf ("first in line", B4).
 * Overdue first, then whatever has waited longest.
 *
 * The day-7, last-day and first-in-line items are worked out as the inbox
 * is read; nothing is stored for them. Server code only; every caller has
 * already checked librarian().
 */

export type InboxKind =
  | 'signup'
  | 'payment'
  | 'requests'
  | 'set_aside'
  | 'overdue'
  | 'change'
  | 'more_time'
  | 'turn';

/** Who an item is about, with what the contact links need. */
export interface InboxPerson {
  /** Empty for a loan whose borrower deleted their account. */
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: MemberStatus | null;
}

interface ItemBase {
  /** `${kind}:${id}`, as it appears in the address (?item=). */
  key: string;
  person: InboxPerson;
  /** When it started waiting on the librarian. */
  since: string;
}

export interface SignUpItem extends ItemBase {
  kind: 'signup';
  signUp: SignUp;
}

export interface PaymentItem extends ItemBase {
  kind: 'payment';
  /** What's still to pay. */
  owes: ('deposit' | 'subscription')[];
}

export interface InboxRequest {
  id: string;
  book_id: string;
  book_title: string;
  handover: 'in_person' | 'courier';
  courier_address: string | null;
  member_note: string | null;
  created_at: string;
  /** Whether a copy is on the shelf right now (out on loan or set aside for someone else, if not). */
  available: boolean;
}

export interface RequestsItem extends ItemBase {
  kind: 'requests';
  /** One person's waiting requests, oldest first. */
  requests: InboxRequest[];
  /** Books they hold now (requests, set-asides and loans) against their limit. */
  held: number;
  limit: number;
}

export interface SetAsideItem extends ItemBase {
  kind: 'set_aside';
  request: InboxRequest & { set_aside_until: string };
  /** `nudge` from day 7; `release` on the window's last day and after. */
  stage: 'nudge' | 'release';
}

export interface InboxLoan {
  id: string;
  book_id: string;
  book_title: string;
  lent_at: string;
  due_at: string;
  extended_count: number;
  handover: 'in_person' | 'courier';
  courier_address: string | null;
  note: string | null;
}

export interface OverdueItem extends ItemBase {
  kind: 'overdue';
  loan: InboxLoan;
}

export interface ChangeItem extends ItemBase {
  kind: 'change';
  change: {
    id: string;
    current: DetailValues;
    new_values: Partial<DetailValues>;
    member_note: string | null;
  };
}

export interface MoreTimeItem extends ItemBase {
  kind: 'more_time';
  ask: {
    id: string;
    extra: string;
    member_note: string | null;
    /** Asks on this loan so far, this one included. */
    asks: number;
    /** The due date if approved (YYYY-MM-DD): from the due date, or from today if it's already late. */
    new_due_on: string;
  };
  loan: Pick<InboxLoan, 'id' | 'book_id' | 'book_title' | 'lent_at' | 'due_at' | 'extended_count'>;
}

/**
 * A waited-for book is on the shelf (returned, or a set-aside released):
 * set it aside for someone in its line. `person` is the suggestion, the
 * first in line who can borrow; null if everyone waiting is paused.
 */
export interface TurnItem extends ItemBase {
  kind: 'turn';
  line: Line;
  suggested: LineEntry | null;
}

export type InboxItem =
  | SignUpItem
  | PaymentItem
  | RequestsItem
  | SetAsideItem
  | OverdueItem
  | ChangeItem
  | MoreTimeItem
  | TurnItem;

const DAY = 24 * 60 * 60 * 1000;

/** A timestamp from the database (a Date or a string) as an ISO string. */
function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

/**
 * Everything waiting, after the same upkeep as the desk always ran (pauses
 * brought up to date, declined people past their 30 days deleted). The
 * reads are one read-only transaction: one round trip.
 */
export async function getInbox(): Promise<InboxItem[]> {
  await Promise.all([syncPauses(), purgeDeclined()]);
  const sql = db();
  const [signUps, approved, requests, setAsides, overdue, changes, asks, waiting] = await sql.transaction(
    [
      sql`
        select id, source, name, email, phone, location, instagram, life_stage, college, linkedin,
               joined_at
        from members
        where status = 'pending'
        order by joined_at asc`,
      sql`
        select m.id, m.name, m.email, m.phone, m.approved_at, m.joined_at,
               array(select distinct p.kind from payments p
                     where p.member_id = m.id and p.status in ('paid', 'waived')) as settled
        from members m
        where m.status = 'approved'`,
      sql`
        select r.id, r.book_id, r.book_title, r.handover, r.courier_address, r.member_note, r.created_at,
               m.id as member_id, m.name as member_name, m.email, m.phone, m.status as member_status,
               m.borrow_limit,
               ((select count(*) from requests o
                 where o.member_id = m.id and o.status in ('requested', 'accepted'))
                + (select count(*) from loans l
                   where l.member_id = m.id and l.returned_at is null))::int as held,
               ((select count(*) from loans l where l.book_id = r.book_id and l.returned_at is null)
                + (select count(*) from requests a
                   where a.book_id = r.book_id and a.status = 'accepted'))::int as taken
        from requests r join members m on m.id = r.member_id
        where r.status = 'requested'
        order by r.created_at asc`,
      sql`
        select r.id, r.book_id, r.book_title, r.handover, r.courier_address, r.member_note, r.created_at,
               r.set_aside_until,
               m.id as member_id, m.name as member_name, m.email, m.phone, m.status as member_status,
               (now() >= r.set_aside_until - interval '1 day') as last_day
        from requests r join members m on m.id = r.member_id
        where r.status = 'accepted' and r.set_aside_until is not null
          and now() >= r.set_aside_until - interval '7 days'
        order by r.set_aside_until asc`,
      sql`
        select l.id, l.book_id, l.book_title, l.lent_at, l.due_at, l.extended_count, l.handover,
               l.courier_address, l.note,
               m.id as member_id, coalesce(m.name, l.member_name, 'Someone') as member_name,
               m.email, m.phone, m.status as member_status
        from loans l left join members m on m.id = l.member_id
        where l.returned_at is null and l.due_at < now()
        order by l.due_at asc`,
      sql`
        select d.id, d.member_id, m.name as member_name, m.email, m.phone, m.status as member_status,
               d.new_values, d.member_note, d.created_at,
               json_build_object('name', m.name, 'phone', m.phone, 'location', m.location,
                                 'instagram', m.instagram, 'college', m.college,
                                 'linkedin', m.linkedin) as current
        from detail_changes d join members m on m.id = d.member_id
        where d.status = 'pending'
        order by d.created_at asc`,
      // new_due_on: the same date approveMoreTime (lib/more-time.ts) sets.
      sql`
        select a.id, a.extra, a.member_note, a.created_at,
               (select count(*) from more_time_asks b where b.loan_id = l.id)::int as asks,
               (greatest((l.due_at at time zone 'Asia/Kolkata')::date,
                         (now() at time zone 'Asia/Kolkata')::date)
                + a.extra::interval)::date::text as new_due_on,
               l.id as loan_id, l.book_id, l.book_title, l.lent_at, l.due_at, l.extended_count,
               m.id as member_id, coalesce(m.name, l.member_name, 'Someone') as member_name,
               m.email, m.phone, m.status as member_status
        from more_time_asks a
        join loans l on l.id = a.loan_id
        left join members m on m.id = l.member_id
        where a.status = 'pending' and l.returned_at is null
        order by a.created_at asc`,
      waitlistRowsQuery(),
    ],
    { readOnly: true },
  );

  const copies = await copiesOf();
  const items: InboxItem[] = [];
  const person = (row: Row): InboxPerson => ({
    id: (row.member_id as string | null) ?? null,
    name: row.member_name as string,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    status: (row.member_status as MemberStatus | null) ?? null,
  });

  for (const row of signUps as Row[]) {
    const signUp = row as unknown as SignUp;
    items.push({
      kind: 'signup',
      key: `signup:${signUp.id}`,
      person: { id: signUp.id, name: signUp.name, email: signUp.email, phone: signUp.phone, status: 'pending' },
      since: iso(signUp.joined_at),
      signUp,
    });
  }

  for (const row of approved as Row[]) {
    const settled = row.settled as string[];
    const owes = (['deposit', 'subscription'] as const).filter((kind) => !settled.includes(kind));
    if (owes.length === 0) continue;
    items.push({
      kind: 'payment',
      key: `payment:${row.id}`,
      person: {
        id: row.id as string,
        name: row.name as string,
        email: row.email as string,
        phone: row.phone as string,
        status: 'approved',
      },
      since: iso(row.approved_at ?? row.joined_at),
      owes: [...owes],
    });
  }

  // One item per person, holding all their waiting requests.
  const byPerson = new Map<string, RequestsItem>();
  for (const row of requests as Row[]) {
    const request: InboxRequest = {
      id: row.id as string,
      book_id: row.book_id as string,
      book_title: row.book_title as string,
      handover: row.handover as InboxRequest['handover'],
      courier_address: (row.courier_address as string | null) ?? null,
      member_note: (row.member_note as string | null) ?? null,
      created_at: iso(row.created_at),
      available: (row.taken as number) < (copies.get(row.book_id as string) ?? 1),
    };
    const memberId = row.member_id as string;
    const existing = byPerson.get(memberId);
    if (existing) {
      existing.requests.push(request);
    } else {
      byPerson.set(memberId, {
        kind: 'requests',
        key: `requests:${memberId}`,
        person: person(row),
        since: request.created_at,
        requests: [request],
        held: row.held as number,
        limit: row.borrow_limit as number,
      });
    }
  }
  items.push(...byPerson.values());

  for (const row of setAsides as Row[]) {
    const until = iso(row.set_aside_until);
    const lastDay = Boolean(row.last_day);
    items.push({
      kind: 'set_aside',
      key: `set_aside:${row.id}`,
      person: person(row),
      since: new Date(new Date(until).getTime() - (lastDay ? 1 : 7) * DAY).toISOString(),
      stage: lastDay ? 'release' : 'nudge',
      request: {
        id: row.id as string,
        book_id: row.book_id as string,
        book_title: row.book_title as string,
        handover: row.handover as InboxRequest['handover'],
        courier_address: (row.courier_address as string | null) ?? null,
        member_note: (row.member_note as string | null) ?? null,
        created_at: iso(row.created_at),
        available: false,
        set_aside_until: until,
      },
    });
  }

  for (const row of overdue as Row[]) {
    items.push({
      kind: 'overdue',
      key: `overdue:${row.id}`,
      person: person(row),
      since: iso(row.due_at),
      loan: {
        id: row.id as string,
        book_id: row.book_id as string,
        book_title: row.book_title as string,
        lent_at: iso(row.lent_at),
        due_at: iso(row.due_at),
        extended_count: row.extended_count as number,
        handover: row.handover as InboxLoan['handover'],
        courier_address: (row.courier_address as string | null) ?? null,
        note: (row.note as string | null) ?? null,
      },
    });
  }

  for (const row of changes as Row[]) {
    items.push({
      kind: 'change',
      key: `change:${row.id}`,
      person: person(row),
      since: iso(row.created_at),
      change: {
        id: row.id as string,
        current: row.current as DetailValues,
        new_values: row.new_values as Partial<DetailValues>,
        member_note: (row.member_note as string | null) ?? null,
      },
    });
  }

  for (const row of asks as Row[]) {
    items.push({
      kind: 'more_time',
      key: `more_time:${row.id}`,
      person: person(row),
      since: iso(row.created_at),
      ask: {
        id: row.id as string,
        extra: row.extra as string,
        member_note: (row.member_note as string | null) ?? null,
        asks: row.asks as number,
        new_due_on: row.new_due_on as string,
      },
      loan: {
        id: row.loan_id as string,
        book_id: row.book_id as string,
        book_title: row.book_title as string,
        lent_at: iso(row.lent_at),
        due_at: iso(row.due_at),
        extended_count: row.extended_count as number,
      },
    });
  }

  // Waited-for books on the shelf: whose turn it is.
  for (const line of groupLines(waiting as Row[], copies)) {
    if (!line.on_shelf) continue;
    const suggested = firstEligible(line);
    const lead = suggested ?? line.entries[0];
    items.push({
      kind: 'turn',
      key: `turn:${line.book_id}`,
      person: {
        id: lead.member_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
      },
      since: line.last_returned ?? line.entries[0].created_at,
      line,
      suggested,
    });
  }

  // Overdue first (the latest-due last), then whatever has waited longest.
  const time = (value: string) => new Date(value).getTime();
  return items.sort((a, b) => {
    if ((a.kind === 'overdue') !== (b.kind === 'overdue')) return a.kind === 'overdue' ? -1 : 1;
    return time(a.since) - time(b.since);
  });
}

type Row = Record<string, unknown>;
