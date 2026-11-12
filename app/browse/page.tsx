import type { Metadata } from 'next';
import PaintedCard from '@/components/PaintedCard';
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
            <PaintedCard href={link.href} title={link.title} blurb={link.blurb} slot={link.slot} />
          </li>
        ))}
      </ul>
    </section>
  );
}
