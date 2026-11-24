'use client';

import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';
import type { SignInDestination } from './page';

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

const FALLBACK_ERROR = 'That didn’t work. Check the address and try again.';
const UNREACHABLE = 'Couldn’t reach the sign-in service. Try again.';

/**
 * Neon Auth normally answers in under a second; if it hasn't in 20, stop
 * waiting so the button doesn't say "Sending…" forever (e.g. the sign-in
 * settings are missing on a new branch). A late answer is ignored; at
 * worst the email still arrives.
 */
const TIMEOUT_MS = 20_000;

async function withinTimeout<T>(request: Promise<T>): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), TIMEOUT_MS);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The two ways in: a sign-in link by email, or Google. Both come back to
 * `next` (/account, or /desk for the librarian's sign-in), which must stay
 * a path proxy.ts runs on: that's where the return trip becomes the login
 * cookie. The address is absolute because the link is opened from Neon
 * Auth's own site. An empty joinUrl hides the "Join the library" line.
 */
export default function SignInForm({ next, joinUrl }: { next: SignInDestination; joinUrl: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const busy = state.kind === 'busy';

  const returnTo = () => `${window.location.origin}${next}`;

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    setState({ kind: 'busy' });
    try {
      const result = await withinTimeout(
        authClient.signIn.magicLink({ email: address, callbackURL: returnTo() }),
      );
      if (result === 'timeout') {
        setState({ kind: 'error', message: UNREACHABLE });
      } else if (result.error) {
        setState({ kind: 'error', message: result.error.message || FALLBACK_ERROR });
      } else {
        setState({ kind: 'sent', email: address });
      }
    } catch {
      setState({ kind: 'error', message: UNREACHABLE });
    }
  }

  async function withGoogle() {
    setState({ kind: 'busy' });
    // On success the browser leaves for Google, so only a failure lands here.
    try {
      const result = await withinTimeout(
        authClient.signIn.social({ provider: 'google', callbackURL: returnTo() }),
      );
      if (result === 'timeout') {
        setState({ kind: 'error', message: UNREACHABLE });
      } else if (result.error) {
        setState({ kind: 'error', message: result.error.message || 'Google sign-in didn’t start. Try again.' });
      }
    } catch {
      setState({ kind: 'error', message: UNREACHABLE });
    }
  }

  if (state.kind === 'sent') {
    return (
      <div className="member-sent" role="status">
        <p className="member-copy">
          Check your email. A sign-in link is on its way to <strong>{state.email}</strong>, and it works
          for 15 minutes.
        </p>
        <p className="member-hint">
          Not there? Look in spam, or{' '}
          <button type="button" className="text-button" onClick={() => setState({ kind: 'idle' })}>
            send another
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <form className="member-form" onSubmit={sendLink}>
        <label htmlFor="signin-email" className="stamp-label">
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>

      <p className="member-or" aria-hidden="true">
        or
      </p>
      <button type="button" className="btn btn-secondary" onClick={withGoogle} disabled={busy}>
        Continue with Google
      </button>

      {state.kind === 'error' && (
        <p className="member-error" role="alert">
          {state.message}
        </p>
      )}

      {joinUrl && (
        <p className="member-hint">
          New here?{' '}
          <a href={joinUrl} target="_blank" rel="noopener noreferrer">
            Join the library
          </a>{' '}
          first.
        </p>
      )}
    </>
  );
}
