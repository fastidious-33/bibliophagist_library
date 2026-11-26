import { after } from 'next/server';
import { composeEmail } from '@/lib/emails';
import { isSanityConfigured } from '@/lib/sanity/client';
import { getAllBooks } from '@/lib/search/sanity';
import { SITE_URL } from '@/lib/site';

/**
 * Events the site sends to Activepieces Flow 1 (M3-BORROWING.md §12), which
 * emails the right person. Activepieces only delivers: what happened, to
 * whom, and the email's words, are decided here (lib/emails.ts).
 *
 * Each event is a POST to ACTIVEPIECES_WEBHOOK_URL with the
 * `x-library-secret` header (AUTOMATION_SECRET). It's sent after the page
 * has answered (Next's after()), so nobody waits on it, and a failure is
 * only logged: an action never fails because an email didn't go. Without
 * the URL or the secret (a computer without them), nothing is sent.
 *
 * Never in an event: phone numbers or addresses.
 */

/**
 * The events Flow 1 receives. Each arrives with its finished email
 * (`to`, `subject`, `text`, worded in lib/emails.ts), so the flow is just
 * the webhook and one Gmail step. The librarian's own notes (new requests,
 * "more time" asks, change requests) come in the morning digest instead of
 * one email each; only `member.deleted` (a deposit to refund) is instant.
 */
export type LibraryEvent =
  | 'member.approved'
  | 'member.declined'
  | 'member.activated'
  | 'request.accepted'
  | 'request.declined'
  | 'waitlist.set_aside'
  | 'loan.lent'
  | 'loan.extended'
  | 'loan.returned'
  | 'more_time.approved'
  | 'more_time.declined'
  | 'member.deleted'
  | 'member.change_decided'
  /** The daily run (lib/reminders.ts): one member's reminders, worded already. */
  | 'reminder'
  /** The daily run: what's waiting at the desk, to the librarian, worded already. */
  | 'desk.digest';

export interface EventBook {
  /** The call number. */
  id: string;
  title: string;
  /** Its page on the site, if it's in the catalog. */
  url: string | null;
}

/** What every event carries besides its own fields: who it's for. */
export interface EventPayload {
  /** The email to send to: the member's, or the librarian's for "to you" events. */
  to: string;
  /** The member's name (also on "to you" events: who it's about). */
  name: string;
  [field: string]: unknown;
}

const IST = 'Asia/Kolkata';
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });

/** A date as emails write it: "17 Dec 2026". A YYYY-MM-DD date is that day in India. */
export function eventDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
  return dateFormat.format(date);
}

/** The librarian's address for "to you" events: the first of LIBRARIAN_EMAILS. */
export function librarianEmail(): string {
  return (process.env.LIBRARIAN_EMAILS ?? '').split(',')[0]?.trim() ?? '';
}

/**
 * Books as events carry them, with a link to each one's page, from the
 * catalog's cached list (no Sanity read of its own). If the list can't be
 * loaded, the books go without links.
 */
export async function eventBooks(books: { id: string; title: string }[]): Promise<EventBook[]> {
  let slugs = new Map<string, string>();
  if (isSanityConfigured && books.length > 0) {
    try {
      slugs = new Map((await getAllBooks()).map((book) => [book.id, book.slug]));
    } catch (error) {
      console.error('Events: the catalog list could not be loaded for book links', error);
    }
  }
  return books.map((book) => {
    const slug = slugs.get(book.id);
    return { id: book.id, title: book.title, url: slug ? `${SITE_URL}/catalog/${slug}` : null };
  });
}

/** One book, as eventBooks. */
export async function eventBook(id: string, title: string): Promise<EventBook> {
  return (await eventBooks([{ id, title }]))[0];
}

/** True when events can be sent (the webhook URL and the secret are set). */
export function eventsEnabled(): boolean {
  return Boolean(process.env.ACTIVEPIECES_WEBHOOK_URL?.trim() && process.env.AUTOMATION_SECRET);
}

/**
 * Send an event to Flow 1, after the response. The links every email may
 * want are added here (account, desk, catalog, sign-in), then its
 * `subject` and `text` from lib/emails.ts, unless the caller worded them
 * already (the daily run does).
 */
export function sendEvent(event: LibraryEvent, payload: EventPayload): void {
  const url = process.env.ACTIVEPIECES_WEBHOOK_URL?.trim();
  const secret = process.env.AUTOMATION_SECRET;
  if (!url || !secret || !payload.to) return;

  const fields = {
    event,
    ...payload,
    account_url: `${SITE_URL}/account`,
    desk_url: `${SITE_URL}/desk`,
    catalog_url: `${SITE_URL}/catalog`,
    signin_url: `${SITE_URL}/signin`,
  };
  const email =
    typeof payload.subject === 'string' && typeof payload.text === 'string'
      ? { subject: payload.subject, text: payload.text }
      : composeEmail(event, fields);
  const body = JSON.stringify({ ...fields, ...email });

  const send = async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-library-secret': secret },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.error(`Event ${event}: Activepieces answered ${response.status}`);
    } catch (error) {
      console.error(`Event ${event} was not sent:`, error instanceof Error ? error.message : error);
    }
  };

  try {
    after(send);
  } catch {
    // Outside a request (shouldn't happen): send now, without waiting.
    void send();
  }
}
