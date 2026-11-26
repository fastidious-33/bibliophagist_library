'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { approveSignUps, declineSignUps, librarian } from '@/lib/desk';
import {
  createMember,
  deletePayment,
  DESK_STATUSES,
  memberContact,
  memberLoginId,
  paidDeposit,
  recordPayment,
  removeLogin,
  refundDeposit,
  reopenChangeRequests,
  setBorrowLimit,
  updateMember,
  type MemberInput,
  type PaymentInput,
} from '@/lib/desk-members';
import { DEPOSIT_AMOUNT, SUBSCRIPTION_AMOUNT, UPI_ID } from '@/lib/account';
import { eventBook, eventBooks, eventDate, librarianEmail, sendEvent } from '@/lib/events';
import {
  addMonths,
  EXTEND_PRESETS,
  extendLoan,
  extendLoanBy,
  bookHolds,
  getBook,
  lendBooks,
  loanContact,
  MAX_LEND_BOOKS,
  MAX_LOAN_MONTHS,
  returnLoan,
  todayInIndia,
  type ExtendPreset,
} from '@/lib/desk-loans';
import {
  acceptRequests,
  approveChange,
  declineChange,
  declineRequests,
  extendSetAside,
  releaseSetAside,
  SET_ASIDE_DAYS,
  type DecidedRequest,
} from '@/lib/desk-requests';
import { approveMoreTime, declineMoreTime } from '@/lib/more-time';
import { copiesOf, getAvailability } from '@/lib/availability';
import { getHoldings } from '@/lib/requests';
import { lineBookOf, moveInLine, removeFromLine, setAsideFromLine } from '@/lib/waitlist';
import { deleteMember, formatCardNo, type LifeStage, type MemberStatus } from '@/lib/members';
import type { DeskResult } from './DeskForm';

/**
 * The desk's actions (M3 A2). A server action can be called by anyone who
 * finds it, so each one checks it's the librarian before touching anything.
 * Each takes the form's data, with ids in hidden fields.
 */

async function requireLibrarian(): Promise<void> {
  if (!(await librarian())) throw new Error('Only the librarian can do that.');
}

/** A uuid from a hidden field, so nothing else ever reaches a query. */
function idField(form: FormData, name: string): string {
  const id = String(form.get(name) ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`Missing ${name}.`);
  return id;
}

/** Every uuid under one name (ticked rows in the inbox), at most 50. */
function idsField(form: FormData, name: string): string[] {
  const ids = form
    .getAll(name)
    .map(String)
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 50);
  if (ids.length === 0) throw new Error(`Missing ${name}.`);
  return ids;
}

/** One answer from a form: trimmed, capped, and empty as null. */
function text(form: FormData, name: string, max = 200): string | null {
  const value = String(form.get(name) ?? '').trim().slice(0, max);
  return value || null;
}

function dateField(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function amountField(form: FormData, name: string): number | null {
  const value = Number(form.get(name));
  return Number.isInteger(value) && value >= 0 && value <= 100000 ? value : null;
}

function refreshMember(id: string): void {
  revalidatePath('/desk');
  revalidatePath('/desk/members');
  revalidatePath(`/desk/members/${id}`);
}

// ---------- Emails (A4): what each action tells Activepieces ----------
// sendEvent (lib/events.ts) goes after the response, and a failure is only
// logged, so none of these can make an action fail. Payments marked here
// send no note to the librarian: they did it themselves.

/** An email to a loan's borrower about it, with the book and its (current) due date. */
async function tellLoan(
  event: 'loan.extended' | 'loan.returned' | 'more_time.approved' | 'more_time.declined',
  loan: { name: string; email: string | null; book_id: string; book_title: string; due_at: string } | null,
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (!loan?.email) return;
  sendEvent(event, {
    to: loan.email,
    name: loan.name,
    book: await eventBook(loan.book_id, loan.book_title),
    due: eventDate(loan.due_at),
    ...extra,
  });
}

/** One email per request decided (several may be ticked at once). */
async function tellRequests(
  event: 'request.accepted' | 'request.declined',
  requests: DecidedRequest[],
  note: string | null,
): Promise<void> {
  for (const request of requests) {
    sendEvent(event, {
      to: request.email,
      name: request.name,
      book: await eventBook(request.book_id, request.book_title),
      until: eventDate(request.set_aside_until),
      handover: request.handover,
      note,
    });
  }
}

// ---------- Members (group 2) ----------

const LIFE_STAGES: LifeStage[] = ['working', 'student', 'in_between'];

/** The member form's fields, checked. A string is the error to show. */
function memberInput(form: FormData): MemberInput | string {
  const name = text(form, 'name', 100);
  const email = text(form, 'email', 200)?.toLowerCase() ?? null;
  const phone = text(form, 'phone', 30);
  const status = String(form.get('status') ?? '') as MemberStatus;
  const lifeStage = String(form.get('life_stage') ?? '') as LifeStage;

  if (!name) return 'Enter a name.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email.';
  if (!phone || phone.replace(/\D/g, '').length < 7) return 'Enter a phone number.';
  if (!DESK_STATUSES.includes(status)) return 'Choose a stage.';

  return {
    name,
    email,
    phone,
    location: text(form, 'location'),
    instagram: text(form, 'instagram', 100),
    life_stage: LIFE_STAGES.includes(lifeStage) ? lifeStage : null,
    college: text(form, 'college'),
    linkedin: text(form, 'linkedin', 300),
    status,
    librarian_note: text(form, 'librarian_note', 2000),
    decline_note: text(form, 'decline_note', 500),
  };
}

const EMAIL_TAKEN = 'Another member already uses that email.';

export async function addMember(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const input = memberInput(form);
  if (typeof input === 'string') return { error: input };
  const result = await createMember(input);
  if (result === 'email_taken') return { error: EMAIL_TAKEN };
  revalidatePath('/desk');
  revalidatePath('/desk/members');
  redirect(`/desk/members/${result.id}`);
}

export async function saveMember(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  const input = memberInput(form);
  if (typeof input === 'string') return { error: input };
  const result = await updateMember(id, input);
  if (result === 'email_taken') return { error: EMAIL_TAKEN };
  refreshMember(id);
  return { message: 'Saved.' };
}

/**
 * Same as "Delete my account": only with no books out; the name stays on
 * their loans; then their sign-in goes too, if they ever signed in (needs
 * your login to be a Neon admin). The members list says how it went.
 */
export async function removeMember(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  // Read before deleting: their payments go with them.
  const [loginId, member, deposit] = await Promise.all([memberLoginId(id), memberContact(id), paidDeposit(id)]);
  const result = await deleteMember(id);
  if (result === 'books_out') return { error: 'They still have a book out. Mark it returned first.' };
  if (member) {
    sendEvent('member.deleted', {
      to: librarianEmail(),
      name: member.name,
      removed_at_desk: true,
      deposit_amount: deposit?.amount ?? null,
      deposit_paid_on: eventDate(deposit?.paid_at),
    });
  }
  const loginRemoved = loginId ? await removeLogin(loginId) : true;
  revalidatePath('/desk');
  revalidatePath('/desk/members');
  redirect(`/desk/members?removed=${loginRemoved ? 'done' : 'login-kept'}`);
}

/** A member's own book limit (books at once: requests, set-asides and loans together). */
export async function saveLimitAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  const limit = Number(form.get('limit'));
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) return { error: 'Choose a limit from 1 to 10.' };
  if (!(await setBorrowLimit(id, limit))) return { error: 'That member no longer exists.' };
  refreshMember(id);
  return { message: 'Saved.' };
}

export async function allowChangeRequests(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  await reopenChangeRequests(id);
  refreshMember(id);
  return { message: 'Change requests are open again.' };
}

// ---------- Payments (group 2) ----------

export async function addPayment(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  const kind = form.get('kind') === 'subscription' ? 'subscription' : 'deposit';
  const status = form.get('status') === 'waived' ? 'waived' : 'paid';
  const method = String(form.get('method') ?? '');
  const amount = amountField(form, 'amount') ?? (kind === 'deposit' ? DEPOSIT_AMOUNT : SUBSCRIPTION_AMOUNT);
  const paidOn = dateField(form, 'paidOn');
  if (status === 'paid' && !paidOn) return { error: 'Enter the date it was paid.' };

  const payment: PaymentInput = {
    kind,
    status,
    amount: status === 'waived' ? 0 : amount,
    method: method === 'upi' || method === 'cash' || method === 'other' ? method : null,
    reference: text(form, 'reference', 100),
    paidOn: paidOn ?? '',
    note: text(form, 'note', 500),
  };
  const result = await recordPayment(id, payment);
  if (result === 'not_member') return { error: 'Payments open once they’re approved.' };
  if (result === 'already') {
    return {
      error:
        kind === 'deposit'
          ? 'The deposit is already marked. Refund or remove that entry first.'
          : 'The membership is already marked. Remove that entry first if it was a mistake.',
    };
  }
  refreshMember(id);
  return { message: 'Payment marked.' };
}

export async function refund(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  const amount = amountField(form, 'amount');
  const refundedOn = dateField(form, 'refundedOn');
  if (amount === null) return { error: 'Enter the amount refunded.' };
  if (!refundedOn) return { error: 'Enter the date it was refunded.' };
  const done = await refundDeposit(id, idField(form, 'paymentId'), amount, refundedOn);
  if (!done) return { error: 'Only a paid deposit can be refunded.' };
  refreshMember(id);
  return {};
}

export async function removePayment(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  await deletePayment(id, idField(form, 'paymentId'));
  refreshMember(id);
  return {};
}

// ---------- Lending (group 3) ----------

function refreshLoans(): void {
  revalidatePath('/desk');
  revalidatePath('/desk/out');
  revalidatePath('/desk/members', 'layout');
}

/**
 * Lend one or several books in one handover (B4): the same member, due
 * date, handover and note for each. Two checks can be overridden with a
 * tick: a book already out or set aside for someone else ("I have another
 * copy"), and going over the member's own book limit. Any request they had
 * open for these books is marked lent, and they leave those waitlists.
 */
export async function lend(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const memberId = String(form.get('memberId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return { error: 'Choose who’s borrowing.' };

  // Books are looked up again rather than trusting the form's titles.
  const bookIds = [...new Set(form.getAll('bookId').map((id) => String(id).slice(0, 100)))].slice(0, MAX_LEND_BOOKS);
  const books = (await Promise.all(bookIds.map((id) => getBook(id)))).filter(
    (book): book is NonNullable<typeof book> => book !== null,
  );
  if (books.length === 0) return { error: 'Add a book first.' };
  if (books.length < bookIds.length) return { error: 'One of those books isn’t in the catalog any more. Remove it and try again.' };

  const today = todayInIndia();
  const dueOn = dateField(form, 'dueOn');
  const allowLonger = form.get('allowLonger') === 'on';
  if (!dueOn || dueOn < today) return { error: 'Choose a due date from today on.' };
  if (!allowLonger && dueOn > addMonths(today, MAX_LOAN_MONTHS)) {
    return { error: `That’s more than ${MAX_LOAN_MONTHS} months away. Tick “Allow longer” to go ahead.` };
  }

  const handover = form.get('handover') === 'courier' ? 'courier' : 'in_person';
  const courierAddress = text(form, 'courierAddress', 500);
  if (handover === 'courier' && !courierAddress) return { error: 'Enter the courier address.' };

  // Out, or set aside for someone else, with every copy taken.
  const [holds, copies, holdings] = await Promise.all([bookHolds(books.map((b) => b._id)), copiesOf(), getHoldings(memberId)]);
  if (form.get('lendAnyway') !== 'on') {
    const taken = books.filter((book) => {
      const hold = holds.get(book._id);
      const others = (hold?.out.length ?? 0) + (hold?.setAside.filter((s) => s.member_id !== memberId).length ?? 0);
      return others >= (copies.get(book._id) ?? 1);
    });
    if (taken.length > 0) {
      return {
        error: `${taken.map((b) => `“${b.title}”`).join(', ')} ${taken.length === 1 ? 'is' : 'are'} out or set aside for someone else. Tick “Lend anyway” if you have another copy.`,
      };
    }
  }

  // Their own limit: books they'd hold afterwards. A book they'd already
  // asked for (or had set aside) is swapped for its loan, not added.
  const alreadyHeld = books.filter((book) =>
    holdings.books.some((held) => held.book_id === book._id && held.kind === 'request'),
  ).length;
  const after = holdings.open + books.length - alreadyHeld;
  if (after > holdings.limit && form.get('overLimit') !== 'on') {
    return {
      error: `That would make ${after} books at once; their limit is ${holdings.limit}. Tick “Over their limit” to lend anyway, or raise the limit on their file.`,
    };
  }

  const lent = books.map((book) => ({ id: book._id, title: book.title }));
  await lendBooks({ memberId, books: lent, dueOn, handover, courierAddress, note: text(form, 'note', 500) });

  // One email for the whole handover, listing every book.
  const member = await memberContact(memberId);
  if (member) {
    const linked = await eventBooks(lent);
    sendEvent('loan.lent', {
      to: member.email,
      name: member.name,
      book: linked[0],
      books: linked,
      books_text: linked.map((book) => book.title).join(', '),
      count: linked.length,
      due: eventDate(dueOn),
      handover,
    });
  }
  refreshLoans();
  revalidatePath('/desk/waitlist');
  redirect('/desk/out');
}

export async function extend(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const loanId = idField(form, 'loanId');
  const dueOn = dateField(form, 'dueOn');
  if (!dueOn) return { error: 'Choose the new due date.' };
  const result = await extendLoan(loanId, dueOn, form.get('allowLonger') === 'on');
  if (result === 'gone') return { error: 'That loan isn’t out any more.' };
  if (result === 'not_later') return { error: 'Choose a date after the current due date.' };
  if (result === 'too_long') {
    return { error: `That’s more than ${MAX_LOAN_MONTHS} months after it was lent. Tick “Allow longer” to go ahead.` };
  }
  await tellLoan('loan.extended', await loanContact(loanId));
  refreshLoans();
  return { message: 'Extended.' };
}

/** Mark a loan returned; the email says "you can borrow again" if that ended a pause. */
export async function markReturned(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const loanId = idField(form, 'loanId');
  const before = await loanContact(loanId);
  await returnLoan(loanId);
  const now = before?.member_id ? await memberContact(before.member_id) : null;
  await tellLoan('loan.returned', before, {
    active_again: before?.status === 'paused' && now?.status === 'active',
  });
  refreshLoans();
  return {};
}

// ---------- Book requests and change requests (group 4) ----------

const ALREADY_DECIDED = 'Already decided: reload the desk.';

/** "Your details were updated" or "…weren't", to the member. */
async function tellChangeDecided(memberId: string, decision: 'approved' | 'declined', note: string | null): Promise<void> {
  const member = await memberContact(memberId);
  if (member) sendEvent('member.change_decided', { to: member.email, name: member.name, decision, note });
}

export async function approveDetailsChange(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const memberId = await approveChange(idField(form, 'changeId'));
  if (!memberId) return { error: ALREADY_DECIDED };
  await tellChangeDecided(memberId, 'approved', null);
  refreshLoans();
  return {};
}

export async function declineDetailsChange(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const note = text(form, 'note', 500);
  const memberId = await declineChange(idField(form, 'changeId'), note);
  if (!memberId) return { error: ALREADY_DECIDED };
  await tellChangeDecided(memberId, 'declined', note);
  refreshLoans();
  return {};
}

// ---------- The inbox (account and desk rework, B3) ----------
// Each answers with the word its stamp shows ("Approved"), or an error;
// the item stays put on an error.

/** Approve one or several ticked sign-ups (memberId, repeated). */
export async function approveSignUpsAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const approved = await approveSignUps(idsField(form, 'memberId'));
  if (approved.length === 0) return { error: ALREADY_DECIDED };
  for (const member of approved) {
    sendEvent('member.approved', {
      to: member.email,
      name: member.name,
      card_no: member.card_no !== null ? formatCardNo(member.card_no) : null,
      upi_id: UPI_ID || null,
      deposit: DEPOSIT_AMOUNT,
      subscription: SUBSCRIPTION_AMOUNT,
      total: DEPOSIT_AMOUNT + SUBSCRIPTION_AMOUNT,
    });
  }
  refreshLoans();
  return { message: 'Approved' };
}

/** Decline one or several ticked sign-ups, with one note they'll see. */
export async function declineSignUpsAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const note = text(form, 'note', 500);
  const declined = await declineSignUps(idsField(form, 'memberId'), note);
  if (declined.length === 0) return { error: ALREADY_DECIDED };
  for (const member of declined) sendEvent('member.declined', { to: member.email, name: member.name, note });
  refreshLoans();
  return { message: 'Declined' };
}

/** Accept one or several waiting book requests (requestId, repeated): each is set aside for pickup. */
export async function acceptRequestsAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const accepted = await acceptRequests(idsField(form, 'requestId'));
  if (accepted.length === 0) return { error: ALREADY_DECIDED };
  await tellRequests('request.accepted', accepted, null);
  refreshLoans();
  return { message: 'Accepted' };
}

/** Decline one or several waiting book requests, with one note they'll see. */
export async function declineRequestsAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const note = text(form, 'note', 500);
  const declined = await declineRequests(idsField(form, 'requestId'), note);
  if (declined.length === 0) return { error: ALREADY_DECIDED };
  await tellRequests('request.declined', declined, note);
  refreshLoans();
  return { message: 'Declined' };
}

/** "Mark ₹500 deposit paid": the usual amount, by UPI, today. Anything else goes through the member's file. */
export async function markPaidAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const id = idField(form, 'memberId');
  const kind = form.get('kind') === 'subscription' ? 'subscription' : 'deposit';
  const result = await recordPayment(id, {
    kind,
    status: 'paid',
    amount: kind === 'deposit' ? DEPOSIT_AMOUNT : SUBSCRIPTION_AMOUNT,
    method: 'upi',
    reference: null,
    paidOn: todayInIndia(),
    note: null,
  });
  if (result === 'not_member') return { error: 'Payments open once they’re approved.' };
  if (result === 'already') return { error: 'That’s already marked. Reload the desk.' };
  refreshMember(id);
  return { message: 'Paid' };
}

/**
 * Extend a loan by +15, +30 or +45 days (from today if it's already late).
 * Past MAX_LOAN_MONTHS from lending only with allowLonger: the button asks
 * first and sends it.
 */
export async function extendByAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const loanId = idField(form, 'loanId');
  const preset = String(form.get('preset') ?? '') as ExtendPreset;
  if (!EXTEND_PRESETS.includes(preset)) return { error: 'Choose how long to extend it.' };
  const result = await extendLoanBy(loanId, preset, form.get('allowLonger') === 'on');
  if (result === 'gone') return { error: 'That loan isn’t out any more.' };
  if (result === 'too_long') {
    return { error: `That’s more than ${MAX_LOAN_MONTHS} months after it was lent. Reload the desk and try again.` };
  }
  if (result === 'not_later') return { error: 'That wouldn’t move the due date. Reload the desk.' };
  await tellLoan('loan.extended', await loanContact(loanId));
  refreshLoans();
  return { message: 'Extended' };
}

/** A set-aside book that wasn't collected: back to the shelf. */
export async function releaseSetAsideAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  if (!(await releaseSetAside(idField(form, 'requestId')))) return { error: ALREADY_DECIDED };
  refreshLoans();
  return { message: 'Released' };
}

/** A set-aside book gets 7 more days for pickup. */
export async function extendSetAsideAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  if (!(await extendSetAside(idField(form, 'requestId'), 7))) return { error: ALREADY_DECIDED };
  refreshLoans();
  return { message: 'Extended' };
}

// ---------- The waitlist (B4) ----------

function refreshWaitlist(): void {
  refreshLoans();
  revalidatePath('/desk/waitlist');
}

/**
 * Set a waited-for book aside for someone in its line (waitId): their place
 * becomes a set-aside request. Only while a copy is on the shelf.
 */
export async function setAsideFromLineAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const waitId = idField(form, 'waitId');
  const bookId = await lineBookOf(waitId);
  if (!bookId) return { error: 'They’re not in this line any more. Reload the desk.' };
  const availability = await getAvailability([bookId]);
  if (!availability[bookId]?.available) {
    return { error: 'It’s still out or set aside for someone else. Mark it returned or release it first.' };
  }
  const setAside = await setAsideFromLine(waitId, SET_ASIDE_DAYS);
  if (!setAside) return { error: ALREADY_DECIDED };
  sendEvent('waitlist.set_aside', {
    to: setAside.email,
    name: setAside.name,
    book: await eventBook(setAside.book_id, setAside.book_title),
    until: eventDate(setAside.set_aside_until),
  });
  refreshWaitlist();
  return { message: 'Set aside' };
}

export async function moveUpAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  if (!(await moveInLine(idField(form, 'waitId'), 'up'))) return { error: 'They’re already first.' };
  refreshWaitlist();
  return {};
}

export async function moveDownAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  if (!(await moveInLine(idField(form, 'waitId'), 'down'))) return { error: 'They’re already last.' };
  refreshWaitlist();
  return {};
}

export async function removeFromLineAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  if (!(await removeFromLine(idField(form, 'waitId')))) return { error: ALREADY_DECIDED };
  refreshWaitlist();
  return { message: 'Removed' };
}

/** "Ask for more time": approve (the due date moves by what they asked). */
export async function approveMoreTimeAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const loanId = await approveMoreTime(idField(form, 'askId'));
  if (!loanId) return { error: ALREADY_DECIDED };
  // The email carries the new due date.
  await tellLoan('more_time.approved', await loanContact(loanId));
  refreshLoans();
  return { message: 'Approved' };
}

/** "Ask for more time": decline, with an optional note they see on their slip. */
export async function declineMoreTimeAction(_previous: DeskResult, form: FormData): Promise<DeskResult> {
  await requireLibrarian();
  const note = text(form, 'note', 500);
  const loanId = await declineMoreTime(idField(form, 'askId'), note);
  if (!loanId) return { error: ALREADY_DECIDED };
  await tellLoan('more_time.declined', await loanContact(loanId), { note });
  refreshLoans();
  return { message: 'Declined' };
}
