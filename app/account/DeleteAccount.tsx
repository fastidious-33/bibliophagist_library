'use client';

import Link from 'next/link';
import { createContext, useActionState, useContext, useState, type ReactNode } from 'react';
import { authClient } from '@/lib/auth/client';
import { deleteAccount, type DeleteState } from './actions';

/**
 * "Delete my account" (M3-BORROWING.md §10), at the foot of the Details
 * tab. AccountCard wraps the whole page so that, once the account is gone,
 * it all turns into a goodbye instead of still showing the details that
 * were just deleted.
 */

const DeletedContext = createContext<() => void>(() => {});

export function AccountCard({ children }: { children: ReactNode }) {
  const [deleted, setDeleted] = useState(false);
  if (!deleted) {
    return (
      <div className="account">
        <DeletedContext.Provider value={() => setDeleted(true)}>{children}</DeletedContext.Provider>
      </div>
    );
  }
  return (
    <div className="member-card stamp-card" role="status">
      <span className="stamp-label">Borrower&rsquo;s card</span>
      <h1 className="member-title">Account deleted</h1>
      <p className="member-copy">
        Your details, payments, requests and waitlist places are gone, and you&rsquo;re signed out.
        The books you borrowed stay in the library&rsquo;s history with only your name. If you paid
        the deposit, I&rsquo;ll refund it by UPI.
      </p>
      <Link href="/" className="btn">
        Back to the library
      </Link>
    </div>
  );
}

export default function DeleteAccount({ booksOut }: { booksOut: number }) {
  const markDeleted = useContext(DeletedContext);
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteState>(async () => {
    const result = await deleteAccount();
    if (result.status === 'deleted') {
      // The server already signed them out; this also clears the browser's
      // copy of the session, so the header's name goes too.
      await authClient.signOut().catch(() => undefined);
      markDeleted();
    }
    return result;
  }, { status: 'idle' });

  if (!confirming) {
    return (
      <button type="button" className="text-button account-delete-open" onClick={() => setConfirming(true)}>
        Delete my account
      </button>
    );
  }

  const refused = booksOut > 0 || state.status === 'books_out';

  return (
    <div className="account-delete">
      <h2 className="account-heading">Delete my account</h2>
      {refused ? (
        <p className="member-copy">
          Return your {booksOut === 1 ? 'book' : 'books'} first. You can delete your account once nothing
          is out.
        </p>
      ) : (
        <p className="member-copy">
          This deletes your details, payments, open requests and waitlist places, and signs you out. The books
          you borrowed stay in the library&rsquo;s history with only your name. It can&rsquo;t be
          undone.
        </p>
      )}
      {state.status === 'error' && (
        <p className="member-error" role="alert">
          Nothing was deleted. Sign in again and try once more.
        </p>
      )}
      <form action={formAction} className="btn-row">
        {!refused && (
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Deleting…' : 'Yes, delete it'}
          </button>
        )}
        <button type="button" className="btn" onClick={() => setConfirming(false)} disabled={pending}>
          Keep my account
        </button>
      </form>
    </div>
  );
}
