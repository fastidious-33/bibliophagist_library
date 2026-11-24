'use client';

import { useTransition } from 'react';
import { cancelRequest } from './actions';

/** "Cancel" on a waiting request (M3 A3). Once accepted, they ask the librarian instead. */
export default function CancelRequest({ requestId, title }: { requestId: string; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="text-button account-cancel"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Cancel your request for “${title}”?`)) {
          startTransition(() => cancelRequest(requestId));
        }
      }}
    >
      {pending ? 'Cancelling…' : 'Cancel'}
    </button>
  );
}
