'use client';

import { useActionState, useEffect, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import type { Viewer } from '@/app/api/availability/route';
import { joinWaitlist, leaveWaitlist, requestBook, type RequestState } from '@/app/account/actions';
import { ordinal } from '@/app/account/format';
import { authClient } from '@/lib/auth/client';
import { JOIN_FORM_URL } from '@/lib/site';
import Availability, { type BookAnswer } from './Availability';

/**
 * "Borrow it" on a book page (M3 A3, §5, §7). The page is cached for
 * everyone, so this asks /api/availability from the browser once someone
 * is signed in, then shows the availability badge and what they can do:
 * the request form for an active member with room and the book on the
 * shelf, or why not. Signed-out visitors are invited to sign in; the
 * librarian sees only the badge (lending happens at the desk).
 *
 * The server checks everything again when a request is sent.
 */
export default function BorrowPanel({ bookId }: { bookId: string }) {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user?.id;
  const [state, setState] = useState<{ userId: string; book: BookAnswer | null; viewer: Viewer | null } | null>(
    null,
  );
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/availability?ids=${encodeURIComponent(bookId)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { books?: Record<string, BookAnswer>; viewer?: Viewer } | null) => {
        if (!cancelled) setState({ userId, book: body?.books?.[bookId] ?? null, viewer: body?.viewer ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ userId, book: null, viewer: null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, bookId, refresh]);

  if (isPending) return null;

  if (!userId) {
    return (
      <p className="borrow-why">
        Members can request this book. <Link href="/signin">Sign in</Link>
        {JOIN_FORM_URL && (
          <>
            {' '}
            or{' '}
            <a href={JOIN_FORM_URL} target="_blank" rel="noopener noreferrer">
              join the library
            </a>
          </>
        )}
        .
      </p>
    );
  }

  const answer = state?.userId === userId ? state : null;
  if (!answer) return null;
  const { book, viewer } = answer;
  const reload = () => setRefresh((n) => n + 1);

  // While it's out: the waitlist for active members (and the place of
  // anyone already in line, paused ones included: they keep it).
  const member = viewer?.kind === 'member' ? viewer : null;
  const waitlist =
    book &&
    !book.available &&
    member &&
    !member.holding[bookId] &&
    (member.status === 'active' || member.waiting[bookId] !== undefined)
      ? member
      : null;

  return (
    <div className="borrow-panel">
      {book && <Availability book={book} />}
      {waitlist ? (
        <WaitlistArea
          bookId={bookId}
          place={waitlist.waiting[bookId]}
          count={waitlist.waitlists}
          max={waitlist.waitlistLimit}
          onChange={reload}
        />
      ) : (
        viewer &&
        book && <RequestArea bookId={bookId} available={book.available} viewer={viewer} onSent={reload} />
      )}
    </div>
  );
}

/**
 * "Join the waitlist" while a book is out (PLAN.md "Account and desk
 * rework"): or their place in line, with Leave. The server checks again.
 */
function WaitlistArea({
  bookId,
  place,
  count,
  max,
  onChange,
}: {
  bookId: string;
  place: number | undefined;
  count: number;
  max: number;
  onChange: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (place !== undefined) {
    return (
      <p className="borrow-why">
        You&rsquo;re {place === 1 ? 'first' : ordinal(place)} in line. I&rsquo;ll set it aside for you when it&rsquo;s
        your turn.{' '}
        <button
          type="button"
          className="text-button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm('Leave the waitlist? You’d lose your place.')) return;
            startTransition(async () => {
              await leaveWaitlist(bookId);
              onChange();
            });
          }}
        >
          {pending ? 'Leaving…' : 'Leave'}
        </button>
      </p>
    );
  }

  if (count >= max) {
    return (
      <p className="borrow-why">
        It&rsquo;s on loan. You&rsquo;re on {max} waitlists, the most at once: leave one on{' '}
        <Link href="/account?tab=waitlist">your account</Link> to join this one.
      </p>
    );
  }

  return (
    <>
      <p className="borrow-why">
        It&rsquo;s on loan. Join the waitlist and I&rsquo;ll set it aside for you when it&rsquo;s your turn.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await joinWaitlist(bookId);
            if (result.status === 'error') setError(result.message ?? 'That didn’t work. Try again.');
            else onChange();
          })
        }
      >
        {pending ? 'Joining…' : 'Join the waitlist'}
      </button>
      {error && (
        <p className="member-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** Why a signed-in person can't request this book, or null if they can. */
function whyNot(viewer: Viewer, bookId: string, available: boolean): ReactNode | null {
  if (viewer.kind === 'librarian') return '';
  if (viewer.kind === 'not_joined') {
    return JOIN_FORM_URL ? (
      <>
        <a href={JOIN_FORM_URL} target="_blank" rel="noopener noreferrer">
          Join the library
        </a>{' '}
        to borrow books.
      </>
    ) : (
      'Join the library to borrow books.'
    );
  }
  const held = viewer.holding[bookId];
  if (held === 'loan') return 'You have this book.';
  if (held === 'request') return (
    <>
      You&rsquo;ve asked for this one. It&rsquo;s on <Link href="/account">your account</Link>.
    </>
  );
  switch (viewer.status) {
    case 'pending':
      return 'Your sign-up is waiting for approval.';
    case 'approved':
      return (
        <>
          Pay the deposit and membership to start borrowing. <Link href="/account">Your account</Link> has the
          details.
        </>
      );
    case 'paused':
      return 'Return your overdue book first, then you can request another.';
    case 'declined':
    case 'left':
      return '';
  }
  if (viewer.open >= viewer.limit) {
    return (
      <>
        You have {viewer.limit} books out or requested, the most at once. See{' '}
        <Link href="/account">your account</Link>.
      </>
    );
  }
  if (!available) return 'It’s on loan. Check back once it’s returned.';
  return null;
}

function RequestArea({
  bookId,
  available,
  viewer,
  onSent,
}: {
  bookId: string;
  available: boolean;
  viewer: Viewer;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [courier, setCourier] = useState(false);
  const [state, formAction, pending] = useActionState<RequestState, FormData>(async (previous, form) => {
    const result = await requestBook(previous, form);
    if (result.status === 'sent') {
      setOpen(false);
      onSent();
    }
    return result;
  }, { status: 'idle' });

  if (state.status === 'sent' && !open) {
    return (
      <p className="borrow-why" role="status">
        Requested. I&rsquo;ll be in touch about the handover; it&rsquo;s on <Link href="/account">your account</Link>{' '}
        meanwhile.
      </p>
    );
  }

  const reason = whyNot(viewer, bookId, available);
  if (reason === '') return null;
  if (reason !== null) return <p className="borrow-why">{reason}</p>;

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Request this book
      </button>
    );
  }

  return (
    <form action={formAction} className="borrow-form">
      <input type="hidden" name="bookId" value={bookId} />
      <fieldset className="borrow-handover">
        <legend>How would you like it?</legend>
        <label>
          <input
            type="radio"
            name="handover"
            value="in_person"
            defaultChecked
            onChange={() => setCourier(false)}
          />{' '}
          In person
        </label>
        <label>
          <input type="radio" name="handover" value="courier" onChange={() => setCourier(true)} /> By courier (you
          pay the courier)
        </label>
      </fieldset>
      {courier && (
        <label>
          <span>Address to courier it to</span>
          <textarea name="courierAddress" rows={3} maxLength={500} required autoComplete="street-address" />
          <span className="borrow-hint">Deleted once the book is back.</span>
        </label>
      )}
      <label>
        <span>A note to me (optional)</span>
        <textarea name="note" rows={2} maxLength={500} />
      </label>
      {state.status === 'error' && (
        <p className="member-error" role="alert">
          {state.message}
        </p>
      )}
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
