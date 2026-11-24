import { getAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { sendEvent } from '@/lib/events';
import {
  changeRequestsClosed,
  recentChangeDecisions,
  type LifeStage,
  type MemberStatus,
} from '@/lib/members';
import { waitlistPlacesQuery, type WaitlistPlace } from '@/lib/waitlist';

/**
 * The desk's members and money (M3 A2, group 2): the member list, one
 * member's whole file, adding and editing members by hand, and payments.
 * Server code only; every caller has already checked librarian() (lib/desk.ts).
 */

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  card_no: number | null;
  joined_at: string;
  declined_at: string | null;
  books_out: number;
}

/**
 * A card number typed into a search box: "42", "0042", "No. 42", "#42".
 * Null when the text isn't one.
 */
export function cardNoFromSearch(search: string): number | null {
  const match = /^\s*(?:no\.?\s*|#)?0*(\d{1,6})\s*$/i.exec(search);
  return match ? Number(match[1]) : null;
}

/** Declined people stay in the archive this long, then are deleted (purgeDeclined). */
export const ARCHIVE_DAYS = 30;

/** When a declined person will be deleted. */
export function archiveEndsOn(declinedAt: string | Date): Date {
  return new Date(new Date(declinedAt).getTime() + ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
}

/** Stages counted as members: in, whether or not they've paid yet. */
export const MEMBER_STATUSES: MemberStatus[] = ['approved', 'active', 'paused'];

/** What the members list can show: members (the default), or one stage, or the archive. */
export const LIST_FILTERS = ['', 'approved', 'active', 'paused', 'pending', 'declined'] as const;
export type ListFilter = (typeof LIST_FILTERS)[number];

export interface DeskMember {
  id: string;
  login_id: string | null;
  source: 'tally' | 'desk';
  name: string;
  email: string;
  phone: string;
  location: string | null;
  instagram: string | null;
  life_stage: LifeStage | null;
  college: string | null;
  linkedin: string | null;
  status: MemberStatus;
  librarian_note: string | null;
  decline_note: string | null;
  consent_at: string | null;
  joined_at: string;
  approved_at: string | null;
  declined_at: string | null;
  card_no: number | null;
  borrow_limit: number;
}

export interface DeskPayment {
  id: string;
  kind: 'deposit' | 'subscription';
  amount: number;
  status: 'paid' | 'waived' | 'refunded';
  method: 'upi' | 'cash' | 'other' | null;
  reference: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  note: string | null;
}

export interface DeskLoan {
  id: string;
  book_id: string;
  book_title: string;
  lent_at: string;
  due_at: string;
  returned_at: string | null;
  extended_count: number;
}

export interface DeskRequest {
  id: string;
  book_id: string;
  book_title: string;
  status: 'requested' | 'accepted';
  created_at: string;
}

export interface MemberFile {
  member: DeskMember;
  /** Every payment, newest first, refunded ones included. */
  payments: DeskPayment[];
  loans: DeskLoan[];
  requests: DeskRequest[];
  /** Their places in waitlists. */
  waiting: WaitlistPlace[];
  changesClosed: boolean;
}

/** Statuses the desk can set by hand. "left" is legacy: removing a member deletes them. */
export const DESK_STATUSES: MemberStatus[] = ['pending', 'approved', 'active', 'paused', 'declined'];

/**
 * The member list: a search over name, email, phone and card number,
 * within members (approved, active, paused; the default), one stage, or
 * the Declined archive (`all` for everyone, as the desk's search uses).
 */
export async function listMembers(search: string, filter: ListFilter | 'all', limit = 300): Promise<MemberRow[]> {
  // Typed text is matched literally: % and _ aren't wildcards here.
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  const cardNo = cardNoFromSearch(search);
  const rows = await db()`
    select m.id, m.name, m.email, m.phone, m.status, m.card_no, m.joined_at, m.declined_at,
           (select count(*) from loans l where l.member_id = m.id and l.returned_at is null)::int as books_out
    from members m
    where (${search} = '' or m.name ilike ${pattern} or m.email ilike ${pattern} or m.phone ilike ${pattern}
           or m.card_no = ${cardNo}::int)
      and (case when ${filter} = 'all' then true
                when ${filter} = '' then m.status in ('approved', 'active', 'paused')
                else m.status = ${filter} end)
    order by lower(m.name)
    limit ${limit}`;
  return rows as MemberRow[];
}

/** A member's own book limit (1–10). False if there's no such member. */
export async function setBorrowLimit(memberId: string, limit: number): Promise<boolean> {
  const rows = await db()`
    update members set borrow_limit = ${limit} where id = ${memberId} returning id`;
  return rows.length > 0;
}

/** Everyone counted as a member, for "Email all members". */
export async function memberEmails(): Promise<string[]> {
  const rows = await db()`
    select email from members where status in ('approved', 'active', 'paused') order by lower(name)`;
  return rows.map((row) => (row as { email: string }).email);
}

/**
 * Deletes declined people once their ARCHIVE_DAYS are up, as "Delete my
 * account" would: any past loans keep their name. Runs whenever the desk
 * loads; A4's daily run will call it too. Skips anyone with a book out.
 */
export async function purgeDeclined(): Promise<void> {
  const sql = db();
  await sql.transaction([
    sql`
      update loans l set member_name = m.name
      from members m
      where l.member_id = m.id and m.status = 'declined'
        and m.declined_at < now() - make_interval(days => ${ARCHIVE_DAYS})
        and not exists (select 1 from loans o where o.member_id = m.id and o.returned_at is null)`,
    sql`
      delete from members m
      where m.status = 'declined'
        and m.declined_at < now() - make_interval(days => ${ARCHIVE_DAYS})
        and not exists (select 1 from loans l where l.member_id = m.id and l.returned_at is null)`,
  ]);
}

/** One member's whole file, in one round trip. Null if there's no such member. */
export async function getMemberFile(id: string): Promise<MemberFile | null> {
  const sql = db();
  const [members, payments, loans, requests, decisions, waiting] = await sql.transaction(
    [
      sql`
        select id, login_id, source, name, email, phone, location, instagram, life_stage, college,
               linkedin, status, librarian_note, decline_note, consent_at, joined_at, approved_at,
               declined_at, card_no, borrow_limit
        from members where id = ${id}`,
      sql`
        select id, kind, amount, status, method, reference, paid_at, refunded_at, refund_amount, note
        from payments where member_id = ${id}
        order by created_at desc`,
      sql`
        select id, book_id, book_title, lent_at, due_at, returned_at, extended_count
        from loans where member_id = ${id}
        order by returned_at desc nulls first, lent_at desc`,
      sql`
        select id, book_id, book_title, status, created_at
        from requests where member_id = ${id} and status in ('requested', 'accepted')
        order by created_at desc`,
      recentChangeDecisions(id),
      waitlistPlacesQuery(id),
    ],
    { readOnly: true },
  );
  const member = members[0] as DeskMember | undefined;
  if (!member) return null;
  return {
    member,
    payments: payments as DeskPayment[],
    loans: loans as DeskLoan[],
    requests: requests as DeskRequest[],
    waiting: waiting as WaitlistPlace[],
    changesClosed: changeRequestsClosed(decisions),
  };
}

/** Everything the desk's member form edits. */
export interface MemberInput {
  name: string;
  email: string;
  phone: string;
  location: string | null;
  instagram: string | null;
  life_stage: LifeStage | null;
  college: string | null;
  linkedin: string | null;
  status: MemberStatus;
  librarian_note: string | null;
  decline_note: string | null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

/** Add a member by hand. `email_taken` if another member has that email. */
export async function createMember(m: MemberInput): Promise<{ id: string } | 'email_taken'> {
  try {
    const rows = await db()`
      insert into members (source, name, email, phone, location, instagram, life_stage, college,
                           linkedin, status, librarian_note, decline_note, approved_at, declined_at,
                           card_no)
      values ('desk', ${m.name}, ${m.email}, ${m.phone}, ${m.location}, ${m.instagram},
              ${m.life_stage}, ${m.college}, ${m.linkedin}, ${m.status}, ${m.librarian_note},
              ${m.decline_note},
              case when ${m.status} in ('approved', 'active', 'paused') then now() end,
              case when ${m.status} = 'declined' then now() end,
              case when ${m.status} in ('approved', 'active', 'paused')
                then nextval('member_card_no_seq') end)
      returning id`;
    const id = (rows[0] as { id: string }).id;
    await refreshStage(id);
    return { id };
  } catch (error) {
    if (isUniqueViolation(error)) return 'email_taken';
    throw error;
  }
}

/**
 * Save the desk's edits. Changing the email unlinks their login, so the
 * new address can claim the record at its next sign-in (M3-BORROWING.md
 * §4). (On the right of `=`, `email` and `login_id` are the values before
 * this update.)
 */
export async function updateMember(id: string, m: MemberInput): Promise<'saved' | 'email_taken'> {
  try {
    await db()`
      update members set
        name = ${m.name}, email = ${m.email}, phone = ${m.phone}, location = ${m.location},
        instagram = ${m.instagram}, life_stage = ${m.life_stage}, college = ${m.college},
        linkedin = ${m.linkedin}, status = ${m.status}, librarian_note = ${m.librarian_note},
        decline_note = ${m.decline_note},
        login_id = case when lower(email) = lower(${m.email}) then login_id end,
        approved_at = case
          when ${m.status} in ('approved', 'active', 'paused') and approved_at is null then now()
          else approved_at end,
        -- A member gets a card number on reaching approved, and keeps it.
        card_no = case
          when ${m.status} in ('approved', 'active', 'paused')
            then coalesce(card_no, nextval('member_card_no_seq'))
          else card_no end,
        -- Declining starts the 30 days; staying declined keeps the date;
        -- any other stage takes them out of the archive.
        declined_at = case when ${m.status} = 'declined' then coalesce(declined_at, now()) end
      where id = ${id}`;
  } catch (error) {
    if (isUniqueViolation(error)) return 'email_taken';
    throw error;
  }
  await refreshStage(id);
  return 'saved';
}

/**
 * Approved ⇄ active, from the payments: active once both the deposit and
 * the membership are paid or waived; back to approved if either stops
 * being so (refunded or removed). Paused, pending and declined members are
 * left alone. Moving from approved to active sends "You can borrow now"
 * (member.activated).
 */
export async function refreshStage(memberId: string): Promise<void> {
  const rows = await db()`
    with prior as (select id, status from members where id = ${memberId})
    update members m
    set status = case
      when (select count(distinct kind) from payments p
            where p.member_id = m.id and p.status in ('paid', 'waived')) = 2 then 'active'
      else 'approved' end
    from prior
    where m.id = prior.id and m.status in ('approved', 'active')
    returning m.name, m.email, m.status, m.borrow_limit, prior.status as was`;
  const row = rows[0] as { name: string; email: string; status: string; borrow_limit: number; was: string } | undefined;
  if (row && row.was === 'approved' && row.status === 'active') {
    sendEvent('member.activated', { to: row.email, name: row.name, limit: row.borrow_limit });
  }
}

/** A member's name and email, for an event about them. Null if there's no such member. */
export async function memberContact(memberId: string): Promise<{ name: string; email: string; status: MemberStatus } | null> {
  const rows = await db()`select name, email, status from members where id = ${memberId}`;
  return (rows[0] as { name: string; email: string; status: MemberStatus } | undefined) ?? null;
}

/**
 * Their current deposit, if paid (for "refund the deposit" when someone
 * leaves). Read before deleting them: payments go with the member.
 */
export async function paidDeposit(memberId: string): Promise<{ amount: number; paid_at: string | null } | null> {
  const rows = await db()`
    select amount, paid_at from payments
    where member_id = ${memberId} and kind = 'deposit' and status = 'paid'
    order by created_at desc limit 1`;
  return (rows[0] as { amount: number; paid_at: string | null } | undefined) ?? null;
}

export interface PaymentInput {
  kind: 'deposit' | 'subscription';
  status: 'paid' | 'waived';
  amount: number;
  method: 'upi' | 'cash' | 'other' | null;
  reference: string | null;
  /** YYYY-MM-DD */
  paidOn: string;
  note: string | null;
}

/**
 * Mark a payment. Always a new row, so a refunded deposit stays on record
 * (M3-BORROWING.md §6). `already` if one of this kind is already paid or
 * waived (the database allows only one current one); `not_member` unless
 * they're approved, active or paused (no payments for pending or declined
 * people).
 */
export async function recordPayment(
  memberId: string,
  p: PaymentInput,
): Promise<'saved' | 'already' | 'not_member'> {
  try {
    const rows = await db()`
      insert into payments (member_id, kind, amount, status, method, reference, paid_at, note)
      select ${memberId}::uuid, ${p.kind}::text, ${p.amount}::int, ${p.status}::text,
             ${p.status === 'paid' ? p.method : null}::text, ${p.reference}::text,
             ${p.status === 'paid' ? p.paidOn : null}::date, ${p.note}::text
      where exists (select 1 from members
                    where id = ${memberId}::uuid and status in ('approved', 'active', 'paused'))
      returning id`;
    if (rows.length === 0) return 'not_member';
  } catch (error) {
    if (isUniqueViolation(error)) return 'already';
    throw error;
  }
  await refreshStage(memberId);
  return 'saved';
}

/** Refund a paid deposit (the membership isn't refundable, §6). */
export async function refundDeposit(
  memberId: string,
  paymentId: string,
  amount: number,
  refundedOn: string,
): Promise<boolean> {
  const rows = await db()`
    update payments
    set status = 'refunded', refund_amount = ${amount}, refunded_at = ${refundedOn}::date
    where id = ${paymentId} and member_id = ${memberId} and kind = 'deposit' and status = 'paid'
    returning id`;
  await refreshStage(memberId);
  return rows.length > 0;
}

/** Remove a payment entry made by mistake. */
export async function deletePayment(memberId: string, paymentId: string): Promise<void> {
  await db()`delete from payments where id = ${paymentId} and member_id = ${memberId}`;
  await refreshStage(memberId);
}

/** The login a member is linked to (null if they've never signed in). */
export async function memberLoginId(memberId: string): Promise<string | null> {
  const rows = await db()`select login_id from members where id = ${memberId}`;
  return (rows[0] as { login_id: string | null } | undefined)?.login_id ?? null;
}

/**
 * Delete someone else's Neon Auth login, after the desk removed them
 * (M3-BORROWING.md §10). Uses Neon Auth's admin call with the librarian's
 * own session, so it works only once the librarian's login is an admin
 * (Neon Console → Auth → Users → ⋯ → Make admin, on each branch). False if
 * Neon refused; the member is already gone either way.
 */
export async function removeLogin(loginId: string): Promise<boolean> {
  // @neon/auth 0.8 exposes the admin calls (admin/remove-user) without
  // types, so this names the one used. It answers { data, error } rather
  // than throwing; a network failure throws.
  const auth = getAuth() as unknown as AdminAuth;
  const result = await auth.admin
    .removeUser({ userId: loginId })
    .catch((error: unknown) => ({ error }));
  if (result?.error) {
    console.error('Remove member: the member was removed, but their sign-in was not', result.error);
    return false;
  }
  return true;
}

interface AdminAuth {
  admin: { removeUser(args: { userId: string }): Promise<{ error?: unknown } | null> };
}

/** "Allow change requests again" after three declines in a row (§10). */
export async function reopenChangeRequests(memberId: string): Promise<void> {
  await db()`update members set change_requests_reset_at = now() where id = ${memberId}`;
}
