import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import { db, isDatabaseConfigured } from '@/lib/db';
import { loansOutQuery, syncPauses, type LoanOut } from '@/lib/desk-loans';
import { setAsidesQuery, type SetAside } from '@/lib/desk-requests';
import type { LifeStage } from '@/lib/members';

/**
 * The librarian's desk (M3 A2): who may open it, and what it reads. Server
 * code only. The desk is the only place that sees other people's details,
 * so every page and action on it starts with librarian().
 */

/** Emails allowed into /desk (env LIBRARIAN_EMAILS, comma-separated). */
const LIBRARIAN_EMAILS = (process.env.LIBRARIAN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * The signed-in librarian, or null for anyone else (signed out, another
 * account, an email Neon Auth hasn't confirmed, or no LIBRARIAN_EMAILS set).
 * Pages turn null into "not found", so the desk doesn't admit it exists;
 * actions refuse.
 */
export async function librarian(): Promise<{ email: string } | null> {
  if (!isAuthConfigured || !isDatabaseConfigured || LIBRARIAN_EMAILS.length === 0) return null;
  const { data: session } = await getAuth().getSession();
  const user = session?.user;
  if (!user?.emailVerified || !LIBRARIAN_EMAILS.includes(user.email.toLowerCase())) return null;
  return { email: user.email };
}

/** A pending sign-up, as the inbox shows it (lib/desk-inbox.ts). */
export interface SignUp {
  id: string;
  source: 'tally' | 'desk';
  name: string;
  email: string;
  phone: string;
  location: string | null;
  instagram: string | null;
  life_stage: LifeStage | null;
  college: string | null;
  linkedin: string | null;
  joined_at: string;
}

/**
 * The Out now page: books set aside for pickup, and books out (overdue
 * ones first on the page). Pauses are brought up to date first; the reads
 * are one round trip.
 */
export async function getOutNow(): Promise<{ setAsides: SetAside[]; loansOut: LoanOut[] }> {
  await syncPauses();
  const sql = db();
  const [setAsides, loansOut] = await sql.transaction([setAsidesQuery(), loansOutQuery()], { readOnly: true });
  return { setAsides: setAsides as SetAside[], loansOut: loansOut as LoanOut[] };
}

/** Who an action was about, for its email (lib/events.ts). */
export interface Contact {
  id: string;
  name: string;
  email: string;
  card_no: number | null;
}

/**
 * Approve a pending sign-up, giving them the next card number (kept if
 * they had one before). Only a pending one, so a double click does nothing
 * twice. Null if they weren't pending.
 */
export async function approveSignUp(memberId: string): Promise<Contact | null> {
  const rows = await db()`
    update members set status = 'approved', approved_at = now(),
      card_no = coalesce(card_no, nextval('member_card_no_seq'))
    where id = ${memberId} and status = 'pending'
    returning id, name, email, card_no`;
  return (rows[0] as Contact | undefined) ?? null;
}

/**
 * Approve several pending sign-ups at once (ticked in the inbox), oldest
 * sign-up first, so card numbers follow the order they joined. Returns the
 * ones that were still pending.
 */
export async function approveSignUps(memberIds: string[]): Promise<Contact[]> {
  if (memberIds.length === 0) return [];
  const sql = db();
  const pending = (await sql`
    select id from members where id = any(${memberIds}::uuid[]) and status = 'pending'
    order by joined_at asc`) as { id: string }[];
  const approved: Contact[] = [];
  for (const { id } of pending) {
    const contact = await approveSignUp(id);
    if (contact) approved.push(contact);
  }
  return approved;
}

/**
 * Decline one or several pending sign-ups, with one note they see on
 * /account. They move to the Declined archive and are deleted after
 * ARCHIVE_DAYS. Returns the ones that were still pending.
 */
export async function declineSignUps(memberIds: string[], note: string | null): Promise<Contact[]> {
  if (memberIds.length === 0) return [];
  const rows = await db()`
    update members set status = 'declined', decline_note = ${note}, declined_at = now()
    where id = any(${memberIds}::uuid[]) and status = 'pending'
    returning id, name, email, card_no`;
  return rows as Contact[];
}
