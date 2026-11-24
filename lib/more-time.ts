import { db } from '@/lib/db';
import { syncPauses } from '@/lib/desk-loans';

/**
 * "Ask for more time" on a book out (PLAN.md "Account and desk rework").
 * The member picks how much; the librarian approves (the due date moves,
 * and it may go past the usual 3 months) or declines at the desk (B3).
 * Overdue books can ask too. Server code only; table in db/schema.sql.
 */

/**
 * How much more time a member can ask for: the same steps as the desk's
 * extensions (EXTEND_PRESETS). Each is also a Postgres interval.
 */
export const MORE_TIME_OPTIONS = ['15 days', '30 days', '45 days'] as const;
export type MoreTime = (typeof MORE_TIME_OPTIONS)[number];

/** Asks per loan, whatever their outcome. */
export const MAX_MORE_TIME_ASKS = 3;

export function isMoreTime(value: unknown): value is MoreTime {
  return (MORE_TIME_OPTIONS as readonly unknown[]).includes(value);
}

/**
 * - `sent`: waiting at the desk;
 * - `pending`: this book already has an ask waiting;
 * - `too_many`: MAX_MORE_TIME_ASKS asks on this book already;
 * - `not_yours`: not a book this member has out (or it's been returned).
 *
 * Every check and the insert are one statement.
 */
export async function askMoreTime(
  memberId: string,
  loanId: string,
  extra: MoreTime,
  note: string | null,
): Promise<'sent' | 'pending' | 'too_many' | 'not_yours'> {
  const sql = db();
  const rows = await sql`
    insert into more_time_asks (loan_id, extra, member_note)
    select l.id, ${extra}::text, ${note}::text
    from loans l
    where l.id = ${loanId}::uuid and l.member_id = ${memberId}::uuid and l.returned_at is null
      and (select count(*) from more_time_asks a where a.loan_id = l.id) < ${MAX_MORE_TIME_ASKS}
    on conflict (loan_id) where status = 'pending' do nothing
    returning id`;
  if (rows.length > 0) return 'sent';

  const [state] = (await sql`
    select (l.member_id = ${memberId}::uuid and l.returned_at is null) as mine,
           exists (select 1 from more_time_asks a where a.loan_id = l.id and a.status = 'pending') as waiting
    from loans l
    where l.id = ${loanId}::uuid`) as { mine: boolean; waiting: boolean }[];
  if (!state?.mine) return 'not_yours';
  return state.waiting ? 'pending' : 'too_many';
}

/**
 * The desk approves an ask: the due date moves by the amount asked, from
 * the due date, or from today if the book is already late (so "+15 days"
 * on a late book really gives 15 days). It may go past the usual 3 months.
 * One statement; then a member paused only for this book is active again.
 * False if it was already decided or the book is back.
 *
 * The date is worked out exactly as the inbox shows it (lib/desk-inbox.ts).
 * Returns the loan's id (for the email), or null.
 */
export async function approveMoreTime(askId: string): Promise<string | null> {
  const rows = await db()`
    with a as (
      update more_time_asks set status = 'approved', decided_at = now()
      where id = ${askId} and status = 'pending'
        and exists (select 1 from loans l where l.id = loan_id and l.returned_at is null)
      returning loan_id, extra
    )
    update loans l
    set due_at = (((greatest((l.due_at at time zone 'Asia/Kolkata')::date,
                             (now() at time zone 'Asia/Kolkata')::date)
                    + a.extra::interval)::date + time '23:59:59') at time zone 'Asia/Kolkata'),
        extended_count = l.extended_count + 1
    from a
    where l.id = a.loan_id and l.returned_at is null
    returning l.id`;
  const loanId = (rows[0] as { id: string } | undefined)?.id ?? null;
  if (loanId) await syncPauses();
  return loanId;
}

/**
 * The desk declines an ask, with an optional note the member sees on their
 * slip. Returns the loan's id (for the email), or null if already decided.
 */
export async function declineMoreTime(askId: string, note: string | null): Promise<string | null> {
  const rows = await db()`
    update more_time_asks set status = 'declined', librarian_note = ${note}, decided_at = now()
    where id = ${askId} and status = 'pending'
    returning loan_id`;
  return (rows[0] as { loan_id: string } | undefined)?.loan_id ?? null;
}
