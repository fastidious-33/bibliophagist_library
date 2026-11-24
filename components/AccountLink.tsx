'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

/**
 * The header's top-right corner (M3): "Sign in"; your first name once you
 * are, linking to /account; or "The desk" for the librarian, linking to
 * /desk. It asks who's signed in from the browser after the page appears,
 * so every page stays cached for everyone. Hidden until that answer
 * arrives, so a signed-in reader doesn't see "Sign in" (or the librarian
 * their name) flash first. Only rendered when the site has sign-in set up
 * (layout.tsx).
 *
 * Whether you're the librarian comes from /api/librarian, asked once per
 * signed-in login: the header lives in the layout, so moving between pages
 * doesn't ask again. The list of librarians never reaches the browser.
 *
 * The name is your login's: Google gives one; an email-link login has
 * none, so it reads "Your account".
 */
export default function AccountLink() {
  const { data, isPending } = authClient.useSession();
  const pathname = usePathname();

  const user = data?.user;
  const userId = user?.id;
  const [role, setRole] = useState<{ userId: string; librarian: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch('/api/librarian', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { librarian: false }))
      .then((body: { librarian?: unknown }) => {
        if (!cancelled) setRole({ userId, librarian: body.librarian === true });
      })
      .catch(() => {
        if (!cancelled) setRole({ userId, librarian: false });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // The answer is for this login (not one from before a sign-out).
  const roleKnown = !user || role?.userId === user.id;
  const isLibrarian = Boolean(user) && roleKnown && role?.librarian === true;

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const href = isLibrarian ? '/desk' : user ? '/account' : '/signin';
  const label = isLibrarian ? 'The desk' : user ? firstName || 'Your account' : 'Sign in';
  const isHere = isLibrarian
    ? pathname.startsWith('/desk') || pathname === '/signin'
    : pathname === '/account' || pathname === '/signin';
  const pending = isPending || !roleKnown;

  return (
    <Link
      href={href}
      prefetch={false}
      className={`account-link${isHere ? ' is-active' : ''}${pending ? ' is-pending' : ''}`}
      aria-current={isHere ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}
