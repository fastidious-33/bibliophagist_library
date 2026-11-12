import type { Metadata } from 'next';
import Image from 'next/image';
import Painting from '@/components/Painting';
import PaintedCard from '@/components/PaintedCard';
import { CONTACT } from '@/lib/site';
import { LIBRARIAN_BIO, LIBRARIAN_NAME, LIBRARIAN_PHOTO, ROOMS } from '@/lib/librarian';

export const metadata: Metadata = {
  title: 'The Librarian',
  description: 'The reader behind the shelves: writings, features, saved reading, body art and music.',
};

export default function LibrarianPage() {
  return (
    <section className="section section--flush">
      <div className="section-heading">
        <h1>The Librarian</h1>
      </div>

      <Painting slot="librarian" className="librarian-banner" priority sizes="(max-width: 1100px) 100vw, 1100px" />

      <div className="librarian-intro">
        <figure className="librarian-portrait">
          <Image
            src={LIBRARIAN_PHOTO.src}
            width={LIBRARIAN_PHOTO.width}
            height={LIBRARIAN_PHOTO.height}
            alt={LIBRARIAN_PHOTO.alt}
            sizes="(max-width: 760px) 60vw, 240px"
            priority
          />
          <figcaption>{LIBRARIAN_NAME}</figcaption>
        </figure>
        <div>
          {LIBRARIAN_BIO.map((para) => (
            <p key={para} className="prose prose-lg">
              {para}
            </p>
          ))}
          <p className="librarian-slip-signature librarian-signature">&mdash; A. Rajwade</p>
          <p className="librarian-elsewhere">
            Elsewhere:{' '}
            <a href={CONTACT.substack} target="_blank" rel="noopener noreferrer">
              Substack
            </a>{' '}
            &middot;{' '}
            <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>{' '}
            &middot; <a href={`mailto:${CONTACT.email}`}>Email</a>
          </p>
        </div>
      </div>

      <nav className="subsection" aria-labelledby="rooms-heading">
        <h2 id="rooms-heading" className="subhead">
          The rooms
        </h2>
        <ul className="rooms">
          {ROOMS.map((room) => (
            <li key={room.href}>
              <PaintedCard href={room.href} title={room.title} blurb={room.blurb} slot={room.slot} />
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
