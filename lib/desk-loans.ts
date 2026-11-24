import { db } from '@/lib/db';
import { isSanityConfigured } from '@/lib/sanity/client';
import type { MemberStatus } from '@/lib/members';
import { getAllBooks } from '@/lib/search/sanity';
import type { SearchBook } from '@/lib/search/types';

/**
 * The desk's lending (M3 A2, group 3): finding a book, lending it,
 * extending and returning loans, and pausing members with an overdue book.
 * Server code only; every caller has already checked librarian().
 *
 * A loan's book_id is the book's Sanity _id: stable even if the call
 * number is edited. Imported books' _id is their call number (B123).
 */

/** Rules (M3-BORROWING.md §3). */
export const DEFAULT_LOAN_MONTHS = 1;
export const MAX_LOAN_MONTHS = 3;

// ---------- Dates ----------

/** Today in India, as YYYY-MM-DD. */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** True once a due date has passed (due dates are the end of their day in India). */
export function isOverdue(dueAt: string | Date): boolean {
  return new Date(dueAt).getTime() < Date.now();
}

/** Whole days late, counting the first morning after the due date as 1. */
export function daysLate(dueAt: string | Date): number {
  return Math.floor((Date.now() - new Date(dueAt).getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

/** A YYYY-MM-DD date plus whole months (31 Jan + 1 month rolls into March, like a calendar would). */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

// ---------- Books (from Sanity) ----------

export interface BookChoice {
  _id: string;
  /** The call number, e.g. B123 (missing on a few books). */
  bookId?: string;
  title: string;
  author?: string;
}

/**
 * Books come from the catalog's cached list (getAllBooks: every book, kept
 * under the `books` tag and refreshed by the Sanity webhook and daily), so
 * requests, waitlists, lending and the desk's search never read Sanity
 * themselves. A book published moments ago is found once that list has
 * refreshed. Throws if Sanity can't be reached and nothing is cached.
 */
async function catalogBooks(): Promise<SearchBook[]> {
  if (!isSanityConfigured) return [];
  return getAllBooks();
}

function toChoice(book: SearchBook): BookChoice {
  return { _id: book.id, bookId: book.bookId, title: book.title, author: book.author || undefined };
}

/**
 * Books matching a call number (exactly, any case) or every word of the
 * title (as the start of a word, any case). At most 20, by title. Empty
 * when Sanity isn't set up.
 */
export async function searchBooks(query: string): Promise<BookChoice[]> {
  const term = query.trim().slice(0, 100);
  if (!term) return [];
  const code = term.toUpperCase();
  const words = term
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const startsAWord = (title: string, word: string) =>
    title.startsWith(word) || title.includes(` ${word}`) || title.includes(`-${word}`);

  return (await catalogBooks())
    .filter((book) => {
      if (book.id.toUpperCase() === code || book.bookId?.toUpperCase() === code) return true;
      const title = book.title.toLowerCase();
      return words.length > 0 && words.every((word) => startsAWord(title, word));
    })
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 20)
    .map(toChoice);
}

export async function getBook(id: string): Promise<BookChoice | null> {
  const book = (await catalogBooks()).find((b) => b.id === id);
  return book ? toChoice(book) : null;
}

// ---------- Members to lend to ----------

export interface LendMember {
  id: string;
  name: string;
  status: MemberStatus;
}

/** Everyone the desk might lend to: any stage but declined (you can lend to hand-made members too). */
export async function getLendMembers(): Promise<LendMember[]> {
  const rows = await db()`
    select id, name, status from members
    where status not in ('declined', 'left')
    order by lower(name)`;
  return rows as LendMember[];
}

// ---------- Lending, extending, returning ----------

/** Books in one handover, at most. */
export const MAX_LEND_BOOKS = 10;

export interface LendInput {
  memberId: string;
  /** One or several books, handed over together. */
  books: { id: string; title: string }[];
  /** YYYY-MM-DD; due by the end of that day in India. */
  dueOn: string;
  handover: 'in_person' | 'courier';
  courierAddress: string | null;
  note: string | null;
}

/*
 * Due dates are stored as the end of that day in India
 * ((date + 23:59:59) at time zone 'Asia/Kolkata'), so a book is late only
 * from the next morning.
 */

/**
 * Lend one or several books in one handover, in one transaction: a loan
 * for each (with the same due date, handover and note); any request the
 * member had open for those books (waiting or set aside) is marked lent
 * and linked to its loan; and their places in those books' waitlists go.
 */
export async function lendBooks(loan: LendInput): Promise<void> {
  const sql = db();
  const address = loan.handover === 'courier' ? loan.courierAddress : null;
  const ids = loan.books.map((book) => book.id);
  const titles = loan.books.map((book) => book.title);
  await sql.transaction([
    sql`
      insert into loans (member_id, request_id, book_id, book_title, due_at, handover, courier_address, note)
      select ${loan.memberId}::uuid,
             (select r.id from requests r
              where r.member_id = ${loan.memberId}::uuid and r.book_id = b.id
                and r.status in ('requested', 'accepted')
              order by r.created_at limit 1),
             b.id, b.title,
             ((${loan.dueOn}::date + time '23:59:59') at time zone 'Asia/Kolkata'),
             ${loan.handover}::text, ${address}::text, ${loan.note}::text
      from unnest(${ids}::text[], ${titles}::text[]) as b(id, title)`,
    sql`
      update requests set status = 'lent', decided_at = coalesce(decided_at, now())
      where member_id = ${loan.memberId}::uuid and book_id = any(${ids}::text[])
        and status in ('requested', 'accepted')`,
    sql`
      delete from waitlist where member_id = ${loan.memberId}::uuid and book_id = any(${ids}::text[])`,
  ]);
}

/** Where a book is, before lending it: out with whom, set aside for whom. */
export interface BookHolds {
  out: { member_id: string | null; name: string; due_at: string }[];
  setAside: { member_id: string; name: string }[];
}

/** For each of these books (by id), its open loans and set-asides. One round trip. */
export async function bookHolds(bookIds: string[]): Promise<Map<string, BookHolds>> {
  const holds = new Map<string, BookHolds>(bookIds.map((id) => [id, { out: [], setAside: [] }]));
  if (bookIds.length === 0) return holds;
  const sql = db();
  const [loans, asides] = await sql.transaction(
    [
      sql`
        select l.book_id, l.member_id, coalesce(m.name, l.member_name, 'someone') as name, l.due_at
        from loans l left join members m on m.id = l.member_id
        where l.returned_at is null and l.book_id = any(${bookIds}::text[])
        order by l.due_at`,
      sql`
        select r.book_id, r.member_id, m.name
        from requests r join members m on m.id = r.member_id
        where r.status = 'accepted' and r.book_id = any(${bookIds}::text[])`,
    ],
    { readOnly: true },
  );
  for (const row of loans as { book_id: string; member_id: string | null; name: string; due_at: string }[]) {
    holds.get(row.book_id)?.out.push({ member_id: row.member_id, name: row.name, due_at: row.due_at });
  }
  for (const row of asides as { book_id: string; member_id: string; name: string }[]) {
    holds.get(row.book_id)?.setAside.push({ member_id: row.member_id, name: row.name });
  }
  return holds;
}

/**
 * A new due date. `too_long` if it's more than MAX_LOAN_MONTHS after the
 * lend date and the librarian didn't allow it; `gone` if the loan isn't out.
 */
export async function extendLoan(
  loanId: string,
  dueOn: string,
  allowLonger: boolean,
): Promise<'extended' | 'too_long' | 'not_later' | 'gone'> {
  const sql = db();
  const rows = await sql`
    select (lent_at at time zone 'Asia/Kolkata')::date::text as lent_on,
           (due_at at time zone 'Asia/Kolkata')::date::text as due_on
    from loans where id = ${loanId} and returned_at is null`;
  const loan = rows[0] as { lent_on: string; due_on: string } | undefined;
  if (!loan) return 'gone';
  if (dueOn <= loan.due_on) return 'not_later';
  if (!allowLonger && dueOn > addMonths(loan.lent_on, MAX_LOAN_MONTHS)) return 'too_long';

  await sql`
    update loans
    set due_at = ((${dueOn}::date + time '23:59:59') at time zone 'Asia/Kolkata'),
        extended_count = extended_count + 1
    where id = ${loanId} and returned_at is null`;
  await syncPauses();
  return 'extended';
}

/**
 * The desk's one-tap extensions, in days. Members ask for more time in the
 * same steps (MORE_TIME_OPTIONS in lib/more-time.ts). Each is also a
 * Postgres interval.
 */
export const EXTEND_PRESETS = ['15 days', '30 days', '45 days'] as const;
export type ExtendPreset = (typeof EXTEND_PRESETS)[number];

const PRESET_DAYS: Record<ExtendPreset, number> = { '15 days': 15, '30 days': 30, '45 days': 45 };

/** A YYYY-MM-DD date plus whole days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A YYYY-MM-DD date in India from a stored timestamp. */
function indiaDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

/** One extension choice for a loan: its new due date, and whether that passes MAX_LOAN_MONTHS. */
export interface ExtendChoice {
  preset: ExtendPreset;
  /** "+15 days" */
  label: string;
  /** YYYY-MM-DD */
  dueOn: string;
  pastLimit: boolean;
}

/**
 * The +15 / +30 / +45 day choices for a loan: counted from the due date,
 * or from today if the book is already late (so "+15 days" on a late book
 * really gives 15 days). Any of them may go past MAX_LOAN_MONTHS from
 * lending; the desk asks first when one does.
 */
export function extendChoices(loan: { lent_at: string | Date; due_at: string | Date }): ExtendChoice[] {
  const today = todayInIndia();
  const due = indiaDate(loan.due_at);
  const from = due > today ? due : today;
  const limit = addMonths(indiaDate(loan.lent_at), MAX_LOAN_MONTHS);
  return EXTEND_PRESETS.map((preset) => {
    const dueOn = addDays(from, PRESET_DAYS[preset]);
    return { preset, label: `+${PRESET_DAYS[preset]} days`, dueOn, pastLimit: dueOn > limit };
  });
}

/**
 * Extend by a preset (see extendChoices). Past MAX_LOAN_MONTHS from
 * lending only with allowLonger (the desk asked and the librarian agreed).
 */
export async function extendLoanBy(
  loanId: string,
  preset: ExtendPreset,
  allowLonger: boolean,
): Promise<'extended' | 'too_long' | 'not_later' | 'gone'> {
  const rows = await db()`
    select lent_at, due_at from loans where id = ${loanId} and returned_at is null`;
  const loan = rows[0] as { lent_at: string; due_at: string } | undefined;
  if (!loan) return 'gone';
  const choice = extendChoices(loan).find((c) => c.preset === preset)!;
  return extendLoan(loanId, choice.dueOn, allowLonger);
}

/** A loan with its borrower, for an email about it. */
export interface LoanContact {
  member_id: string | null;
  name: string;
  /** Null once the borrower has deleted their account. */
  email: string | null;
  status: MemberStatus | null;
  book_id: string;
  book_title: string;
  due_at: string;
}

export async function loanContact(loanId: string): Promise<LoanContact | null> {
  const rows = await db()`
    select l.member_id, coalesce(m.name, l.member_name, 'Someone') as name, m.email, m.status,
           l.book_id, l.book_title, l.due_at
    from loans l left join members m on m.id = l.member_id
    where l.id = ${loanId}`;
  return (rows[0] as LoanContact | undefined) ?? null;
}

/** Mark a loan returned: the courier address goes (§10), and a paused member may be active again. */
export async function returnLoan(loanId: string): Promise<void> {
  const sql = db();
  await sql.transaction([
    sql`
      update requests set courier_address = null
      where id = (select request_id from loans where id = ${loanId})`,
    sql`
      update loans set returned_at = now(), courier_address = null
      where id = ${loanId} and returned_at is null`,
  ]);
  await syncPauses();
}

/**
 * Paused while a book is overdue, active again once nothing is (§4): never
 * set by hand. Runs whenever the desk loads or a loan changes; A4's daily
 * run will call it too.
 */
export async function syncPauses(): Promise<void> {
  const sql = db();
  await sql.transaction([
    sql`
      update members m set status = 'paused'
      where m.status = 'active'
        and exists (select 1 from loans l
                    where l.member_id = m.id and l.returned_at is null and l.due_at < now())`,
    sql`
      update members m set status = 'active'
      where m.status = 'paused'
        and not exists (select 1 from loans l
                        where l.member_id = m.id and l.returned_at is null and l.due_at < now())`,
  ]);
}

// ---------- The Out now / Overdue queues ----------

export interface LoanOut {
  id: string;
  book_id: string;
  book_title: string;
  lent_at: string;
  due_at: string;
  extended_count: number;
  handover: 'in_person' | 'courier';
  courier_address: string | null;
  note: string | null;
  member_id: string | null;
  member_name: string;
}

/** A query (not yet run), so getOutNow can fold it into its transaction. */
export function loansOutQuery() {
  return db()`
    select l.id, l.book_id, l.book_title, l.lent_at, l.due_at, l.extended_count, l.handover,
           l.courier_address, l.note, l.member_id,
           coalesce(m.name, l.member_name, 'Someone') as member_name
    from loans l left join members m on m.id = l.member_id
    where l.returned_at is null
    order by l.due_at asc`;
}
