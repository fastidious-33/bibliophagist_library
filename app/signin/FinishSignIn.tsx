'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import type { SignInDestination } from './page';
import SignInForm from './SignInForm';

/**
 * Finishes a sign-in that arrived on /signin with its one-time code still
 * in the address (proxy.ts couldn't finish it: the browser didn't send the
 * cookie that goes with the link). Neon Auth's browser client trades the
 * code for the login when it first asks for the session; this uses the
 * same shared session as the header's account link, so the code is only
 * spent once. Signed in: on to /account or /desk. Not (the link expired or
 * was already used): the form, to send a new one.
 */
export default function FinishSignIn({ next, joinUrl }: { next: SignInDestination; joinUrl: string }) {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const signedIn = Boolean(data?.user);

  useEffect(() => {
    if (!signedIn) return;
    router.replace(next);
    router.refresh();
  }, [signedIn, next, router]);

  if (isPending || signedIn) {
    return (
      <>
        <h1 className="member-title">Signing you in…</h1>
        <p className="member-copy" role="status">
          One moment: taking you to {next === '/desk' ? 'the desk' : 'your account'}.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="member-title">That link has expired</h1>
      <p className="member-copy" role="alert">
        Sign-in links work once, for 15 minutes. Send yourself a new one.
      </p>
      <SignInForm next={next} joinUrl={joinUrl} />
    </>
  );
}
