'use client';

import { useActionState, useState } from 'react';
import { askMoreTime, type MoreTimeState } from './actions';

/** Same values as MORE_TIME_OPTIONS in lib/more-time.ts (kept here so no server code reaches the browser). */
const OPTIONS = [
  { value: '15 days', label: '+15 days' },
  { value: '30 days', label: '+30 days' },
  { value: '45 days', label: '+45 days' },
] as const;

interface Props {
  loanId: string;
  /** Asks so far on this loan, and the most allowed. */
  asks: number;
  maxAsks: number;
  /** Their latest ask, with its date already formatted on the server. */
  lastAsk: { extra: string; status: 'pending' | 'approved' | 'declined'; note: string | null; on: string } | null;
}

/**
 * "Ask for more time" on a due-date slip: pick +15, +30 or +45 days, add
 * a note if you like, and it waits at the desk. While an ask is
 * waiting, the slip says so instead of offering another.
 */
export default function AskMoreTime({ loanId, asks, maxAsks, lastAsk }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<MoreTimeState, FormData>(async (previous, form) => {
    const result = await askMoreTime(previous, form);
    if (result.status === 'sent') setOpen(false);
    return result;
  }, { status: 'idle' });

  if (lastAsk?.status === 'pending') {
    return (
      <p className="more-time-state">
        You asked for {lastAsk.extra} more on {lastAsk.on}. I&rsquo;ll get back to you.
      </p>
    );
  }

  const declined =
    lastAsk?.status === 'declined' ? (
      <p className="more-time-state">
        I couldn&rsquo;t give more time on {lastAsk.on}
        {lastAsk.note ? <>: &ldquo;{lastAsk.note}&rdquo;</> : '.'}
      </p>
    ) : null;

  if (asks >= maxAsks) {
    return (
      <>
        {declined}
        <p className="more-time-state">You&rsquo;ve asked {maxAsks} times for this book. Message me if you need longer.</p>
      </>
    );
  }

  if (!open) {
    return (
      <>
        {declined}
        <button type="button" className="text-button more-time-open" onClick={() => setOpen(true)}>
          Ask for more time
        </button>
      </>
    );
  }

  return (
    <form action={formAction} className="more-time-form">
      <input type="hidden" name="loanId" value={loanId} />
      <fieldset className="more-time-options">
        <legend className="visually-hidden">How much more time?</legend>
        {OPTIONS.map((option, i) => (
          <label key={option.value}>
            <input type="radio" name="extra" value={option.value} defaultChecked={i === 0} />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="more-time-note">
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
          {pending ? 'Sending…' : 'Send'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
