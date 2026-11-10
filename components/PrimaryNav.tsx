'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Two doors and nothing else (M1-DESIGN.md). The Librarian points at
// /about until /librarian exists (M1 group 5).
const LINKS = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/about', label: 'The Librarian' },
];

export default function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="primary-nav" aria-label="Primary">
      {LINKS.map(({ href, label }) => {
        // startsWith, so /catalog/some-book still highlights its parent link.
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`primary-nav-link${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
