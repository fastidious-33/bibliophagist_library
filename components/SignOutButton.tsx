'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

/** Sign out, then home. Used on /account and /desk. */
export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={signOut} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
