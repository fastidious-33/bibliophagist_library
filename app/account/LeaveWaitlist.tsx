'use client';

import { useTransition } from 'react';
import { leaveWaitlist } from './actions';

/** "Leave" on a waitlist row. Leaving gives up the place for good. */
export default function LeaveWaitlist({ bookId, title }: { bookId: string; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="text-button account-cancel"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Leave the waitlist for “${title}”? You’d lose your place.`)) {
          startTransition(() => leaveWaitlist(bookId));
        }
      }}
    >
      {pending ? 'Leaving…' : 'Leave'}
    </button>
  );
}
