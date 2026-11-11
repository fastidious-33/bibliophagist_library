'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BROWSE_SECTIONS } from '@/lib/browse';

// Two doors and nothing else (M1-DESIGN.md). Each link stays highlighted
// across every section it covers: Browse includes the catalog, the ledger
// and the borrowing page.
const LINKS = [
  { href: '/browse', label: 'Browse', sections: BROWSE_SECTIONS },
  { href: '/librarian', label: 'The Librarian', sections: ['/librarian'] },
];

export default function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="primary-nav" aria-label="Primary">
      {LINKS.map(({ href, label, sections }) => {
        // Prefix match, so /catalog/some-book still highlights Browse.
        const isActive = sections.some((s) => pathname === s || pathname.startsWith(`${s}/`));
        return (
          <Link
            key={href}
            href={href}
            className={`primary-nav-link${isActive ? ' is-active' : ''}`}
            aria-current={pathname === href ? 'page' : isActive ? 'true' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
