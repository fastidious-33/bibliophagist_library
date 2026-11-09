'use client';

import { useEffect, useState } from 'react';

export type PageIndexItem = { id: string; label: string };

/**
 * "On this page" contents for long pages. Highlights the section currently
 * in the reading band (a strip ~40% down the viewport) so it doubles as a
 * you-are-here marker once it goes sticky on wide screens.
 */
export default function PageIndex({ items }: { items: PageIndexItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="page-index" aria-label="On this page">
      <span className="page-index-label">On this page</span>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={active === item.id ? 'is-active' : undefined}
              aria-current={active === item.id ? 'location' : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
