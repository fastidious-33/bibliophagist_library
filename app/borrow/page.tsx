import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Painting from '@/components/Painting';
import { REQUEST_FORM_URL, CONTACT } from '@/lib/site';

export const metadata: Metadata = {
  title: 'How to borrow',
  description: 'How to borrow a book from the library, the rules for a borrower, and the rights of a reader.',
};

// Hardcoded for M1; M2 moves page copy to Sanity (M1-DESIGN.md).
const RULES = [
  'Don’t damage the book in any major way. If you do, please buy me a new one.',
  'Minor damage is understandable, at best.',
  'If you haven’t read a quarter of the book in a month (a fifth, for a bigger book), you probably aren’t going to read it soon. Bring it back.',
  'Return the book when I ask for it. I won’t be nice asking a third time.',
  'Don’t scribble or make notes in my book. Not everyone likes annotations, so resist the urge, or buy your own copy.',
  'If I don’t know you personally, I’ll want your verified phone number, LinkedIn and Instagram.',
  'I’ll send an update message, or an automated mail might turn up. Do reply; it’s for my peace of mind.',
];

// Daniel Pennac's ten rights, quoted by title only, with credit.
const RIGHTS = [
  'The right not to read.',
  'The right to skip.',
  'The right not to finish a book.',
  'The right to reread.',
  'The right to read anything.',
  'The right to escapism.',
  'The right to read anywhere.',
  'The right to dip in.',
  'The right to read aloud.',
  'The right to be quiet.',
];

/**
 * Quentin Blake's illustration of the rights, once Walker Books gives
 * permission. Put the file in public/ and fill this in; it then replaces the
 * text list. `credit` is printed under the image as the permission asks.
 */
const RIGHTS_IMAGE: { src: string; width: number; height: number; alt: string; credit: string } | null = null;

export default function BorrowPage() {
  return (
    <section className="section section--flush">
      <div className="section-heading">
        <h1>How to borrow</h1>
      </div>

      <div className="genre-hero">
        <Painting slot="borrow" priority sizes="(max-width: 760px) 100vw, 420px" />
        <div>
          <p className="prose prose-lg">
            This is a personal library, lent out on trust. Borrowing takes three steps, and a few
            rules keep the books coming back.
          </p>
          {/* A real sequence, so the numbers carry information. */}
          <ol className="join-steps">
            <li className="join-step">
              <span className="step-number" aria-hidden="true">1</span>
              <p>
                Find a book in the <Link href="/catalog">catalog</Link> and note its call number.
              </p>
            </li>
            <li className="join-step">
              <span className="step-number" aria-hidden="true">2</span>
              <p>
                {REQUEST_FORM_URL ? (
                  'Request it with the form below.'
                ) : (
                  <>
                    Ask me for it on{' '}
                    <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>{' '}
                    or by <a href={`mailto:${CONTACT.email}`}>email</a>.
                  </>
                )}
              </p>
            </li>
            <li className="join-step">
              <span className="step-number" aria-hidden="true">3</span>
              <p>Read it, then bring it back.</p>
            </li>
          </ol>
        </div>
      </div>

      <section className="subsection" aria-labelledby="borrower-rules-heading">
        <h2 id="borrower-rules-heading" className="subhead">
          Rules for a borrower
        </h2>
        <ol className="borrow-rules">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>

      <section className="subsection" aria-labelledby="reader-rights-heading">
        <h2 id="reader-rights-heading" className="subhead">
          Ten rights, one warning
        </h2>
        <p className="prose">
          A reader has rights too. These are Daniel Pennac&rsquo;s, from{' '}
          <cite>The Rights of the Reader</cite> (Walker Books).
        </p>
        {RIGHTS_IMAGE ? (
          <figure className="reader-rights-figure">
            <Image
              src={RIGHTS_IMAGE.src}
              width={RIGHTS_IMAGE.width}
              height={RIGHTS_IMAGE.height}
              alt={RIGHTS_IMAGE.alt}
              sizes="(max-width: 760px) 100vw, 640px"
            />
            <figcaption className="museum-label">{RIGHTS_IMAGE.credit}</figcaption>
          </figure>
        ) : (
          <ol className="reader-rights">
            {RIGHTS.map((right) => (
              <li key={right}>{right}</li>
            ))}
          </ol>
        )}
        <p className="reader-warning">
          Don&rsquo;t make fun of people who don&rsquo;t read &mdash; or they never will.
        </p>
      </section>

      <div className="btn-row mt-lg">
        {REQUEST_FORM_URL ? (
          <a href={REQUEST_FORM_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Request a book
          </a>
        ) : (
          <Link href="/catalog" className="btn btn-primary">
            Browse the catalog &rarr;
          </Link>
        )}
      </div>
    </section>
  );
}
