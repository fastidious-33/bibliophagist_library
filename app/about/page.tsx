import Link from 'next/link';
import type { Metadata } from 'next';
import PageIndex, { type PageIndexItem } from '@/components/PageIndex';

export const metadata: Metadata = {
  title: 'About',
};

const SECTIONS: PageIndexItem[] = [
  { id: 'about-the-library', label: 'About the library' },
  { id: 'how-to-borrow', label: 'How to borrow' },
];

// Placeholder copy — to be rewritten once the lending rules are settled.
export default function AboutPage() {
  return (
    // The index sits after the first section in the DOM, so on phones it
    // reads as a contents list under the intro; on wide screens the grid
    // lifts it into a sticky left rail beside every section.
    <div className="with-index">
      <section className="section section--flush" id="about-the-library">
        <div className="section-heading">
          <h1>About the library</h1>
        </div>
        <p className="prose prose-lg">
          The Bibliophagist Library is a personal book collection, opened up for
          friends to borrow from. Every book on the shelf is listed in the
          catalog.
        </p>
      </section>

      <PageIndex items={SECTIONS} />

      <section className="section" id="how-to-borrow">
        <div className="section-heading">
          <h2>How to borrow</h2>
        </div>
        {/* A real sequence, so the numbers carry information. */}
        <ol className="join-steps">
          <li className="join-step">
            <span className="step-number" aria-hidden="true">1</span>
            <p>Find a book in the catalog.</p>
          </li>
          <li className="join-step">
            <span className="step-number" aria-hidden="true">2</span>
            <p>Get in touch to borrow it.</p>
          </li>
          <li className="join-step">
            <span className="step-number" aria-hidden="true">3</span>
            <p>Read it, then bring it back.</p>
          </li>
        </ol>
        <div className="mt-md">
          <Link href="/catalog" className="btn btn-primary">
            Browse the catalog &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
