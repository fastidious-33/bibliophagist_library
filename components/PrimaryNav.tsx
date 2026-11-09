'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/about', label: 'About' },
];

export default function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="drawer-tabs" aria-label="Primary">
      {TABS.map(({ href, label }) => {
        // startsWith, so /catalog/some-book still highlights its parent tab.
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`drawer-tab${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
