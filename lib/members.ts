import { db } from '@/lib/db';

/**
 * Members (M3): the people who joined through the Tally form or were added
 * at the desk. Server code only; table in db/schema.sql.
 */

export type MemberStatus = 'pending' | 'approved' | 'active' | 'paused' | 'declined' | 'left';
export type LifeStage = 'working' | 'student' | 'in_between';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string | null;
  instagram: string | null;
  life_stage: LifeStage | null;
  college: string | null;
  linkedin: string | null;
  status: MemberStatus;
  decline_note: string | null;
  joined_at: string;
  approved_at: string | null;
  /** Their library card number, from approval on. */
  card_no: number | null;
  /** Books at once (requests, set-asides and books out together). */
  borrow_limit: number;
}

/** "No. 0042": a card number as it's printed. */
export function formatCardNo(cardNo: number): string {
  return `No. ${String(cardNo).padStart(4, '0')}`;
}

/** The parts of a Neon Auth login this needs. */
interface Login {
  id: string;
  email: string;
  emailVerified: boolean;
}

/**
 * The member record for whoever is signed in.
 *
 * Already linked: found by their login. Not yet: the member with the same
 * email is linked to this login now ("claiming" it, M3-BORROWING.md §4),
 * whether they joined through Tally or were added at the desk. Only when
 * Neon Auth has confirmed the login owns that email (an email link or
 * Google always does), so nobody can claim someone else's record. A record
 * linked to an older login with the same email moves to this one.
 *
 * Returns null when there's no member with that email: they haven't joined.
 */
export async function findMemberForLogin(login: Login): Promise<Member | null> {
  const sql = db();

  const linked = await sql`
    select id, name, email, phone, location, instagram, life_stage, college, linkedin,
           status, decline_note, joined_at, approved_at, card_no, borrow_limit
    from members
    where login_id = ${login.id}
    limit 1`;
  if (linked[0]) return linked[0] as Member;

  if (!login.emailVerified) return null;

  const claimed = await sql`
    update members
    set login_id = ${login.id}
    where lower(email) = lower(${login.email}) and status <> 'left'
    returning id, name, email, phone, location, instagram, life_stage, college, linkedin,
              status, decline_note, joined_at, approved_at, card_no, borrow_limit`;
  return (claimed[0] as Member | undefined) ?? null;
}

/** A Join-form submission, already checked (app/api/automation/join). */
export interface SignUp {
  submissionId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  instagram: string;
  lifeStage: LifeStage | null;
  college: string | null;
  linkedin: string | null;
}

/**
 * - `created`: a new pending member (or someone who'd left, starting over);
 * - `updated`: still pending, so their details were refreshed;
 * - `already_member`: approved, active, paused or declined; nothing changed,
 *   and Flow 3 tells the librarian instead;
 * - `duplicate`: this exact submission was already stored (Activepieces
 *   retried); nothing changed, and Flow 3 stops without sending emails again.
 */
export type SignUpResult = 'created' | 'updated' | 'already_member' | 'duplicate';

/** A sign-up from the Tally Join form, via Activepieces Flow 3 (M3-BORROWING.md §14). */
export async function saveSignUp(s: SignUp): Promise<SignUpResult> {
  const sql = db();

  const seen = await sql`select 1 from members where tally_submission_id = ${s.submissionId} limit 1`;
  if (seen.length > 0) return 'duplicate';

  const existing = await sql`
    select id, status from members where lower(email) = lower(${s.email}) limit 1`;
  const member = existing[0] as { id: string; status: MemberStatus } | undefined;

  if (!member) {
    try {
      await sql`
        insert into members (source, tally_submission_id, name, email, phone, location, instagram,
                             life_stage, college, linkedin, status, consent_at)
        values ('tally', ${s.submissionId}, ${s.name}, ${s.email}, ${s.phone}, ${s.location},
                ${s.instagram}, ${s.lifeStage}, ${s.college}, ${s.linkedin}, 'pending', now())`;
      return 'created';
    } catch (error) {
      // Two submissions for one email arriving at the same moment: the
      // other one won, so treat this one as a second go at a pending sign-up.
      if (isUniqueViolation(error)) return saveSignUp(s);
      throw error;
    }
  }

  if (member.status === 'pending' || member.status === 'left') {
    await sql`
      update members
      set tally_submission_id = ${s.submissionId}, name = ${s.name}, phone = ${s.phone},
          location = ${s.location}, instagram = ${s.instagram}, life_stage = ${s.lifeStage},
          college = ${s.college}, linkedin = ${s.linkedin}, consent_at = now(),
          status = 'pending',
          joined_at = case when status = 'left' then now() else joined_at end,
          approved_at = case when status = 'left' then null else approved_at end,
          left_at = null
      where id = ${member.id}`;
    return member.status === 'left' ? 'created' : 'updated';
  }

  return 'already_member';
}

/**
 * What a member can ask to change from /account (M3-BORROWING.md §10). They
 * never change their record themselves: a request waits at the desk until
 * the librarian approves or declines it. Email isn't here: it's how they
 * sign in, so it's changed only at the desk. Status in life stays as the
 * Join form gave it.
 */
export const CHANGEABLE_FIELDS = ['name', 'phone', 'location', 'instagram', 'college', 'linkedin'] as const;
export type ChangeableField = (typeof CHANGEABLE_FIELDS)[number];
export type DetailValues = Record<ChangeableField, string | null>;

/** Declines in a row (since the librarian last re-opened them) that close change requests. */
export const MAX_DECLINED_CHANGES = 3;

/**
 * The latest decisions that count towards the limit: approved or declined,
 * after members.change_requests_reset_at, newest first. A query (not yet
 * run), so getAccountRecords can fold it into its transaction.
 */
export function recentChangeDecisions(memberId: string) {
  return db()`
    select d.status
    from detail_changes d
    join members m on m.id = d.member_id
    where d.member_id = ${memberId}
      and d.status in ('approved', 'declined')
      and d.decided_at > coalesce(m.change_requests_reset_at, '-infinity')
    order by d.decided_at desc
    limit ${MAX_DECLINED_CHANGES}`;
}

/** Closed when the last MAX_DECLINED_CHANGES decisions were all declines. */
export function changeRequestsClosed(decisions: Record<string, unknown>[]): boolean {
  return (
    decisions.length >= MAX_DECLINED_CHANGES && decisions.every((d) => d.status === 'declined')
  );
}

/**
 * - `sent`: stored as their one pending request (replacing any earlier one);
 * - `unchanged`: nothing differs from their current details;
 * - `closed`: three declines in a row; nothing stored.
 */
/** The fields a change request would change. */
export function changedFields(member: Member, wanted: DetailValues): ChangeableField[] {
  return CHANGEABLE_FIELDS.filter((key) => wanted[key] !== (member[key] ?? null));
}

export async function requestDetailsChange(
  member: Member,
  wanted: DetailValues,
  note: string | null,
): Promise<'sent' | 'unchanged' | 'closed'> {
  const oldValues: Partial<DetailValues> = {};
  const newValues: Partial<DetailValues> = {};
  for (const key of changedFields(member, wanted)) {
    oldValues[key] = member[key] ?? null;
    newValues[key] = wanted[key];
  }
  if (Object.keys(newValues).length === 0) return 'unchanged';

  if (changeRequestsClosed(await recentChangeDecisions(member.id))) return 'closed';

  await db()`
    insert into detail_changes (member_id, old_values, new_values, member_note)
    values (${member.id}, ${JSON.stringify(oldValues)}::jsonb, ${JSON.stringify(newValues)}::jsonb, ${note})
    on conflict (member_id) where status = 'pending'
    do update set old_values = excluded.old_values, new_values = excluded.new_values,
                  member_note = excluded.member_note, created_at = now()`;
  return 'sent';
}

/** Withdrawn requests are simply deleted: they never reached a decision. */
export async function withdrawDetailsChange(memberId: string): Promise<void> {
  await db()`delete from detail_changes where member_id = ${memberId} and status = 'pending'`;
}

/**
 * "Delete my account" (M3-BORROWING.md §10). One transaction:
 *   1. their name is copied onto their loans (loans.member_name), so the
 *      history still says who had each book;
 *   2. the member is deleted, only if no book is out (checked in the same
 *      statement, so a book can't be lent in between).
 * Payments, requests and change requests go with the member (on delete
 * cascade); loans stay, with member_id emptied and only the name kept.
 * If step 2 is refused, step 1 is harmless: the member still exists.
 *
 * - `deleted`: gone (or already gone, e.g. a double click);
 * - `books_out`: refused, a book is still out.
 */
export async function deleteMember(memberId: string): Promise<'deleted' | 'books_out'> {
  const sql = db();
  const [, deleted] = await sql.transaction([
    sql`
      update loans l
      set member_name = m.name
      from members m
      where m.id = ${memberId} and l.member_id = m.id`,
    sql`
      delete from members m
      where m.id = ${memberId}
        and not exists (select 1 from loans l where l.member_id = m.id and l.returned_at is null)
      returning m.id`,
  ]);
  if (deleted.length > 0) return 'deleted';

  const out = await sql`
    select 1 from loans where member_id = ${memberId} and returned_at is null limit 1`;
  return out.length > 0 ? 'books_out' : 'deleted';
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

/** How each stage reads on /account: the stamp and one line on what's next. */
export const STATUS_COPY: Record<MemberStatus, { stamp: string; muted: boolean; line: string }> = {
  pending: {
    stamp: 'Pending',
    muted: true,
    line: 'Thanks for joining. I look over every sign-up myself, and you’ll get an email once I have.',
  },
  approved: {
    stamp: 'Approved',
    muted: false,
    line: 'You’re in. Pay the ₹500 refundable deposit and the ₹300 lifetime membership by UPI; the approval email has the details. You can borrow once I’ve marked them.',
  },
  active: {
    stamp: 'Active',
    muted: false,
    line: 'You can borrow, up to two books at a time.',
  },
  paused: {
    stamp: 'Paused',
    muted: false,
    line: 'A book you have is overdue. Once it’s back, you can borrow again.',
  },
  declined: {
    stamp: 'Not approved',
    muted: true,
    line: 'I wasn’t able to approve this sign-up.',
  },
  left: {
    stamp: 'Closed',
    muted: true,
    line: 'This account has been closed.',
  },
};

export const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  working: 'Working',
  student: 'Student',
  in_between: 'In between',
};
