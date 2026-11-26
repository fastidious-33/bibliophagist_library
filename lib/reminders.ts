import { db } from '@/lib/db';
import { getInbox, type InboxKind } from '@/lib/desk-inbox';
import { syncPauses } from '@/lib/desk-loans';
import { purgeDeclined } from '@/lib/desk-members';
import { digestEmail, reminderEmail } from '@/lib/emails';
import { eventBooks, eventDate, eventsEnabled, librarianEmail, sendEvent, type EventBook } from '@/lib/events';
import { SITE_URL } from '@/lib/site';

/**
 * The daily run (M3-BORROWING.md §12): reminders and the librarian's
 * digest, every morning, woken by Vercel Cron and delivered by Activepieces
 * Flow 1. Also the Sunday export for the backup flow. Server code only;
 * the routes in app/api/automation/ check the secret first.
 */

/** What the daily run did, for its route's answer (and Vercel's logs). */
export interface DailyRun {
  /** Reminders picked today (one per book). */
  reminders: number;
  /** Reminder emails sent (one per member). */
  emails: number;
  /** Whether the librarian's digest went (only when something waits). */
  digest: boolean;
  /** Set when nothing could be sent (no webhook set up): reminders stay unsent for tomorrow. */
  skipped?: string;
}

/** How each kind of inbox item reads in the digest, in the inbox's order. */
const DIGEST_LABELS: [InboxKind, string][] = [
  ['overdue', 'Overdue books'],
  ['requests', 'People asking for books'],
  ['signup', 'Sign-ups'],
  ['payment', 'Payments due'],
  ['turn', 'Waited-for books back on the shelf'],
  ['set_aside', 'Set aside, not yet collected'],
  ['more_time', '"More time" asks'],
  ['change', 'Details changes'],
];

/**
 * The morning run: the upkeep, then each member's reminders in one email,
 * then the digest to the librarian if the inbox isn't empty. Everything
 * goes out through Flow 1 (sendEvent). Without the webhook set up, only the
 * upkeep runs: reminders aren't marked sent, so they go once it is.
 */
export async function runDaily(): Promise<DailyRun> {
  if (!eventsEnabled()) {
    await Promise.all([syncPauses(), purgeDeclined()]);
    return { reminders: 0, emails: 0, digest: false, skipped: 'ACTIVEPIECES_WEBHOOK_URL is not set' };
  }

  const reminders = await takeReminders();
  const byMember = new Map<string, Reminder[]>();
  for (const reminder of reminders) {
    byMember.set(reminder.to, [...(byMember.get(reminder.to) ?? []), reminder]);
  }
  const accountUrl = `${SITE_URL}/account`;
  for (const [to, theirs] of byMember) {
    const email = reminderEmail(theirs[0].name, theirs, accountUrl);
    sendEvent('reminder', { to, name: theirs[0].name, ...email, books: theirs.map((r) => r.book) });
  }

  // The digest: the desk's own inbox, counted (it also runs the upkeep).
  const inbox = await getInbox();
  const counts = DIGEST_LABELS.map(([kind, label]) => ({
    label,
    count: inbox.filter((item) => item.kind === kind).length,
  }));
  const digest = inbox.length > 0 && Boolean(librarianEmail());
  if (digest) {
    const email = digestEmail(counts, `${SITE_URL}/desk`);
    sendEvent('desk.digest', { to: librarianEmail(), name: 'Librarian', ...email });
  }

  return { reminders: reminders.length, emails: byMember.size, digest };
}

export type ReminderKind = 'due_soon' | 'due_today' | 'overdue';

export interface Reminder {
  kind: ReminderKind;
  to: string;
  name: string;
  book: EventBook;
  /** "17 Dec 2026" */
  due: string;
  /** YYYY-MM-DD */
  due_on: string;
  /** Only for overdue: whole days late (7, 14, 21…). */
  days_overdue?: number;
}

/** Days before the due date for "due soon". */
export const DUE_SOON_DAYS = 3;
/** Overdue reminders go every this many days late (7, 14, 21…). */
export const OVERDUE_EVERY_DAYS = 7;

/**
 * Today's reminders, in India's days: due soon (DUE_SOON_DAYS before),
 * due today, and overdue (every OVERDUE_EVERY_DAYS days late). Runs the
 * daily upkeep first (pausing members with an overdue book, deleting
 * declined people past their 30 days).
 *
 * Each reminder is marked sent as the list is handed out (reminders_sent),
 * in the same statement that picks it, so a second call the same day
 * returns nothing. The trade-off (§12): if an email then fails, that
 * reminder waits for the next one due. Loans whose borrower has deleted
 * their account get none.
 */
export async function takeReminders(): Promise<Reminder[]> {
  await Promise.all([syncPauses(), purgeDeclined()]);
  const rows = (await db()`
    with today as (select (now() at time zone 'Asia/Kolkata')::date as d),
    open_loans as (
      select l.id as loan_id, l.book_id, l.book_title, m.name, m.email,
             (l.due_at at time zone 'Asia/Kolkata')::date as due_on,
             (select d from today) - (l.due_at at time zone 'Asia/Kolkata')::date as late
      from loans l join members m on m.id = l.member_id
      where l.returned_at is null
    ),
    picked as (
      select *,
             case when late = -${DUE_SOON_DAYS}::int then 'due_soon'
                  when late = 0 then 'due_today'
                  when late > 0 and late % ${OVERDUE_EVERY_DAYS}::int = 0 then 'overdue'
             end as kind
      from open_loans
    ),
    sent as (
      insert into reminders_sent (loan_id, kind, sent_on)
      select loan_id, kind, (select d from today) from picked where kind is not null
      on conflict do nothing
      returning loan_id, kind
    )
    select p.kind, p.book_id, p.book_title, p.name, p.email, p.due_on::text as due_on, p.late
    from picked p join sent s on s.loan_id = p.loan_id and s.kind = p.kind
    order by p.late desc, p.name`) as {
    kind: ReminderKind;
    book_id: string;
    book_title: string;
    name: string;
    email: string;
    due_on: string;
    late: number;
  }[];

  const books = await eventBooks(rows.map((row) => ({ id: row.book_id, title: row.book_title })));
  return rows.map((row, index) => ({
    kind: row.kind,
    to: row.email,
    name: row.name,
    book: books[index],
    due: eventDate(row.due_on) ?? row.due_on,
    due_on: row.due_on,
    ...(row.kind === 'overdue' ? { days_overdue: row.late } : {}),
  }));
}

/** The weekly backup's columns, in order (the Google Sheet's header row). */
export const EXPORT_COLUMNS = ['Call number', 'Title', 'Member', 'Lent', 'Due', 'Returned', 'Handover'] as const;

/**
 * Every loan, oldest first, as the Sunday backup's rows: dates as
 * YYYY-MM-DD in India. A member who deleted their account appears by the
 * name kept on the loan, marked "(left)". No phone, email or address.
 */
export async function loansForExport(): Promise<string[][]> {
  const rows = (await db()`
    select l.book_id,
           l.book_title,
           coalesce(m.name, coalesce(l.member_name, 'Someone') || ' (left)') as member,
           (l.lent_at at time zone 'Asia/Kolkata')::date::text as lent,
           (l.due_at at time zone 'Asia/Kolkata')::date::text as due,
           coalesce((l.returned_at at time zone 'Asia/Kolkata')::date::text, '') as returned,
           l.handover
    from loans l left join members m on m.id = l.member_id
    order by l.lent_at`) as {
    book_id: string;
    book_title: string;
    member: string;
    lent: string;
    due: string;
    returned: string;
    handover: 'in_person' | 'courier';
  }[];
  return rows.map((row) => [
    row.book_id,
    row.book_title,
    row.member,
    row.lent,
    row.due,
    row.returned,
    row.handover === 'courier' ? 'Courier' : 'In person',
  ]);
}
