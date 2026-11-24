'use server';

import { revalidatePath } from 'next/cache';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import { getAvailability } from '@/lib/availability';
import { isDatabaseConfigured } from '@/lib/db';
import { getBook, loanContact } from '@/lib/desk-loans';
import { paidDeposit } from '@/lib/desk-members';
import { eventBook, eventDate, librarianEmail, sendEvent } from '@/lib/events';
import {
  changedFields,
  deleteMember,
  findMemberForLogin,
  requestDetailsChange,
  withdrawDetailsChange,
} from '@/lib/members';
import { askMoreTime as storeMoreTimeAsk, isMoreTime, MAX_MORE_TIME_ASKS } from '@/lib/more-time';
import { cancelOwnRequest, createRequest, getHoldings } from '@/lib/requests';
import { joinWaitlist as addToWaitlist, leaveWaitlist as removeFromWaitlist, MAX_WAITLISTS } from '@/lib/waitlist';

/**
 * Members' actions (M3 A1c-2, A3): on /account, and "Request this book" on
 * book pages. A server action can be called by anyone who finds it, so
 * each one starts by asking Neon Auth who is signed in and only ever
 * touches that person's own member record.
 */

async function signedInMember() {
  if (!isAuthConfigured || !isDatabaseConfigured) return null;
  const { data: session } = await getAuth().getSession();
  const login = session?.user;
  return login ? findMemberForLogin(login) : null;
}

export interface ChangeState {
  status: 'idle' | 'sent' | 'error';
  message?: string;
}

/** One answer from the form: trimmed, capped, and empty as null. */
function field(form: FormData, name: string, max = 200): string | null {
  const value = String(form.get(name) ?? '').trim().slice(0, max);
  return value || null;
}

/** A row id from a form or a button (requests, loans). */
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * "Request a change": stores what they want as a pending request for the
 * desk. Their member record itself is never touched here.
 */
export async function requestChange(_previous: ChangeState, form: FormData): Promise<ChangeState> {
  const member = await signedInMember();
  if (!member || member.status === 'declined' || member.status === 'left') {
    return { status: 'error', message: 'Sign in again to request a change.' };
  }

  const name = field(form, 'name', 100);
  if (!name) return { status: 'error', message: 'Enter your name.' };

  const phone = field(form, 'phone', 30);
  const digits = phone?.replace(/\D/g, '').length ?? 0;
  if (!phone || digits < 7 || /[^\d\s+()-]/.test(phone)) {
    return { status: 'error', message: 'Enter a phone number, e.g. +91 98765 43210.' };
  }

  const wanted = {
    name,
    phone,
    location: field(form, 'location'),
    instagram: field(form, 'instagram', 100),
    college: field(form, 'college'),
    linkedin: field(form, 'linkedin', 300),
  };
  const result = await requestDetailsChange(member, wanted, field(form, 'note', 500));

  if (result === 'unchanged') {
    return { status: 'error', message: 'That’s the same as your current details. Change something first.' };
  }
  if (result === 'closed') {
    return { status: 'error', message: 'Change requests are closed for now. Ask me if something needs updating.' };
  }
  // To the librarian: which fields, never the values.
  sendEvent('member.change_requested', {
    to: librarianEmail(),
    name: member.name,
    fields: changedFields(member, wanted).join(', '),
  });
  revalidatePath('/account');
  return { status: 'sent' };
}

export async function withdrawChange(): Promise<void> {
  const member = await signedInMember();
  if (!member) return;
  await withdrawDetailsChange(member.id);
  revalidatePath('/account');
}

export interface RequestState {
  status: 'idle' | 'sent' | 'error';
  message?: string;
}

function atLimit(limit: number): string {
  return `You already have ${limit} ${limit === 1 ? 'book' : 'books'} out or requested.`;
}

/**
 * "Request this book" (M3 A3, §5). Checks again on the server, in the
 * spec's order: an active member; under their own limit of open requests plus
 * books out; not already theirs; the book on the shelf. The title is read
 * from the catalog, not taken from the form.
 */
export async function requestBook(_previous: RequestState, form: FormData): Promise<RequestState> {
  const member = await signedInMember();
  if (!member) return { status: 'error', message: 'Sign in to request a book.' };
  if (member.status !== 'active') {
    return {
      status: 'error',
      message:
        member.status === 'paused'
          ? 'Return your overdue book first, then you can request another.'
          : 'Requests open once your membership is active.',
    };
  }

  const bookId = String(form.get('bookId') ?? '').slice(0, 100);
  const book = bookId ? await getBook(bookId) : null;
  if (!book) return { status: 'error', message: 'That book isn’t in the catalog.' };

  const holdings = await getHoldings(member.id);
  if (holdings.books.some((held) => held.book_id === book._id)) {
    return { status: 'error', message: 'You’ve already asked for this one.' };
  }
  if (holdings.open >= holdings.limit) {
    return { status: 'error', message: atLimit(holdings.limit) };
  }
  const availability = await getAvailability([book._id]);
  if (!availability[book._id]?.available) {
    return { status: 'error', message: 'It’s on loan right now. Try again once it’s back.' };
  }

  const handover = form.get('handover') === 'courier' ? 'courier' : 'in_person';
  const courierAddress = String(form.get('courierAddress') ?? '').trim().slice(0, 500) || null;
  if (handover === 'courier' && !courierAddress) {
    return { status: 'error', message: 'Add the address to courier it to.' };
  }

  const note = String(form.get('note') ?? '').trim().slice(0, 500) || null;
  const result = await createRequest(member.id, { bookId: book._id, bookTitle: book.title, handover, courierAddress, note });
  if (result === 'limit') {
    return { status: 'error', message: atLimit(holdings.limit) };
  }
  // To the librarian: the handover choice and their note, never the address.
  sendEvent('request.created', {
    to: librarianEmail(),
    name: member.name,
    book: await eventBook(book._id, book.title),
    handover,
    note,
  });
  revalidatePath('/account');
  revalidatePath('/desk');
  return { status: 'sent' };
}

/** Cancel one of your own requests, while it's still waiting. */
export async function cancelRequest(requestId: string): Promise<void> {
  const member = await signedInMember();
  if (!member || !UUID.test(requestId)) return;
  await cancelOwnRequest(member.id, requestId);
  revalidatePath('/account');
  revalidatePath('/desk');
}

export interface MoreTimeState {
  status: 'idle' | 'sent' | 'error';
  message?: string;
}

/**
 * "Ask for more time" on a book they have out: +15, +30 or +45 days, with
 * an optional note. It waits at the desk; overdue books can
 * ask too.
 */
export async function askMoreTime(_previous: MoreTimeState, form: FormData): Promise<MoreTimeState> {
  const member = await signedInMember();
  if (!member) return { status: 'error', message: 'Sign in again to ask.' };

  const loanId = String(form.get('loanId') ?? '');
  const extra = form.get('extra');
  if (!UUID.test(loanId)) return { status: 'error', message: 'That book isn’t out with you.' };
  if (!isMoreTime(extra)) return { status: 'error', message: 'Pick how much more time you need.' };

  const note = field(form, 'note', 500);
  const result = await storeMoreTimeAsk(member.id, loanId, extra, note);
  switch (result) {
    case 'not_yours':
      return { status: 'error', message: 'That book isn’t out with you.' };
    case 'pending':
      return { status: 'error', message: 'You’ve already asked for this one. I’ll get back to you.' };
    case 'too_many':
      return {
        status: 'error',
        message: `You’ve asked ${MAX_MORE_TIME_ASKS} times for this book. Message me if you need longer.`,
      };
  }
  const loan = await loanContact(loanId);
  if (loan) {
    sendEvent('more_time.asked', {
      to: librarianEmail(),
      name: member.name,
      book: await eventBook(loan.book_id, loan.book_title),
      due: eventDate(loan.due_at),
      extra,
      note,
    });
  }
  revalidatePath('/account');
  revalidatePath('/desk');
  return { status: 'sent' };
}

export interface WaitlistState {
  status: 'idle' | 'joined' | 'error';
  message?: string;
}

/**
 * "Join the waitlist" on a book page. Only for active members, only while
 * the book is out and isn't already theirs, and up to MAX_WAITLISTS books.
 */
export async function joinWaitlist(bookId: string): Promise<WaitlistState> {
  const member = await signedInMember();
  if (!member) return { status: 'error', message: 'Sign in to join the waitlist.' };
  if (member.status !== 'active') {
    return {
      status: 'error',
      message:
        member.status === 'paused'
          ? 'Return your overdue book first, then you can join a waitlist.'
          : 'Waitlists open once your membership is active.',
    };
  }

  const book = bookId ? await getBook(bookId.slice(0, 100)) : null;
  if (!book) return { status: 'error', message: 'That book isn’t in the catalog.' };

  const holdings = await getHoldings(member.id);
  if (holdings.books.some((held) => held.book_id === book._id)) {
    return { status: 'error', message: 'You’ve already got this one, or asked for it.' };
  }
  const availability = await getAvailability([book._id]);
  if (availability[book._id]?.available) {
    return { status: 'error', message: 'It’s on the shelf: request it instead.' };
  }

  const result = await addToWaitlist(member.id, { id: book._id, title: book.title });
  if (result === 'full') {
    return { status: 'error', message: `You’re on ${MAX_WAITLISTS} waitlists, the most at once. Leave one first.` };
  }
  revalidatePath('/account');
  revalidatePath('/desk');
  return { status: 'joined' };
}

/** Leave a book's waitlist. */
export async function leaveWaitlist(bookId: string): Promise<void> {
  const member = await signedInMember();
  if (!member || !bookId) return;
  await removeFromWaitlist(member.id, bookId.slice(0, 100));
  revalidatePath('/account');
  revalidatePath('/desk');
}

export interface DeleteState {
  status: 'idle' | 'deleted' | 'books_out' | 'error';
}

/**
 * Deletes the member, then their login. The library's own data goes first:
 * removing the login is a second, best-effort step (Neon Auth may refuse,
 * e.g. when the sign-in is more than a day old), and a leftover login holds
 * only a name and email. Either way they're signed out.
 *
 * No revalidatePath here: re-rendering /account without a member would
 * swap in "Join the library" before the goodbye message shows.
 */
export async function deleteAccount(): Promise<DeleteState> {
  const member = await signedInMember();
  if (!member) return { status: 'error' };

  // Read before deleting: their payments go with them.
  const deposit = await paidDeposit(member.id);
  const result = await deleteMember(member.id);
  if (result === 'books_out') return { status: 'books_out' };
  // To the librarian: refund the deposit, if they paid one.
  sendEvent('member.deleted', {
    to: librarianEmail(),
    name: member.name,
    removed_at_desk: false,
    deposit_amount: deposit?.amount ?? null,
    deposit_paid_on: eventDate(deposit?.paid_at),
  });

  const auth = getAuth();
  const removed = await auth.deleteUser().catch((error: unknown) => ({ error }));
  if (removed.error) {
    console.error('Delete my account: member deleted, but the login was not removed', removed.error);
  }
  await auth.signOut().catch(() => undefined);
  return { status: 'deleted' };
}
