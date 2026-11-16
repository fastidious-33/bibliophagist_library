import Link from 'next/link';

export type Crumb = { label: string; href?: string };

/** The two top levels a trail starts from, and the catalog under Browse. */
export const BROWSE: Crumb = { label: 'Browse', href: '/browse' };
export const CATALOG: Crumb = { label: 'Catalog', href: '/catalog' };
export const GENRES: Crumb = { label: 'Genres', href: '/catalog/genres' };
export const LIBRARIAN: Crumb = { label: 'The Librarian', href: '/librarian' };

/**
 * "Where am I": the trail from a top level (Browse, The Librarian) down to
 * this page, e.g. Browse › Catalog › Genres › Humor. Every step links back
 * up except the last, which is the page itself. Home and the two top levels
 * don't show one.
 */
export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${i}-${crumb.label}`}>
              {last || !crumb.href ? (
                <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
              ) : (
                <Link href={crumb.href}>{crumb.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
