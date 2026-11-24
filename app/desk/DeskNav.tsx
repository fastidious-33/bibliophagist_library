'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The desk's pages. */
const PAGES = [
  { href: '/desk', label: 'Inbox' },
  { href: '/desk/out', label: 'Out now' },
  { href: '/desk/waitlist', label: 'Waitlist' },
  { href: '/desk/members', label: 'Members' },
  { href: '/desk/lend', label: 'Lend' },
] as const;

/** The desk's navigation: a column in the sidebar, or tabs on a phone. The current page is marked. */
export default function DeskNav() {
  const pathname = usePathname();
  const current = (href: string) => (href === '/desk' ? pathname === '/desk' : pathname.startsWith(href));

  return (
    <nav className="desk-tabs" aria-label="Desk pages">
      {PAGES.map(({ href, label }) => (
        <Link key={href} href={href} className="desk-tab" aria-current={current(href) ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
