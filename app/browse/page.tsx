import type { Metadata } from 'next';
import Link from 'next/link';
import Painting from '@/components/Painting';
import { BROWSE_LINKS } from '@/lib/browse';

export const metadata: Metadata = {
  title: 'Browse',
  description: 'Borrow a book, search the catalog, wander the genres, see the librarian’s picks and the ledger.',
};

export default function BrowsePage() {
  return (
    <section className="section section--flush">
      <div className="section-heading">
        <h1>Browse</h1>
      </div>
      <p className="prose prose-lg">Every way into the library, starting with how to take a book home.</p>

      <ul className="rooms">
        {BROWSE_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="door">
              <Painting slot={link.slot} sizes="(max-width: 760px) 100vw, 340px" decorative showLabel={false} />
              <span className="door-title">{link.title}</span>
              <span className="door-blurb">{link.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
