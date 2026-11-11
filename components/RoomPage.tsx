import type { ReactNode } from 'react';
import Link from 'next/link';
import Painting from '@/components/Painting';
import type { PaintingSlot } from '@/lib/paintings';
import type { Entry, EntryGroup } from '@/lib/librarian';

/**
 * The shared frame for a room in the Librarian section: title, painting
 * beside the intro, the room's content, and the way back.
 */
export default function RoomPage({
  title,
  slot,
  intro,
  children,
}: {
  title: string;
  slot: PaintingSlot;
  intro: string[];
  children: ReactNode;
}) {
  return (
    <section className="section section--flush">
      <div className="section-heading">
        <h1>{title}</h1>
      </div>

      <div className="genre-hero">
        <Painting slot={slot} priority sizes="(max-width: 760px) 100vw, 420px" />
        <div>
          {intro.map((para) => (
            <p key={para} className="prose prose-lg">
              {para}
            </p>
          ))}
        </div>
      </div>

      {children}

      <div className="back-row">
        <Link href="/librarian" className="btn btn-secondary">
          &larr; Back to the Librarian
        </Link>
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** A list of outside links, like entries in a reading register. */
export function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="entry-list">
      {entries.map((e) => (
        <li key={e.url} className="entry">
          <a href={e.url} target="_blank" rel="noopener noreferrer" className="entry-title">
            {e.title}
          </a>
          {(e.source || e.date) && (
            <span className="entry-meta">
              {e.source}
              {e.source && e.date && ' · '}
              {e.date && <time dateTime={e.date}>{formatDate(e.date)}</time>}
            </span>
          )}
          {e.blurb && <p className="entry-blurb">{e.blurb}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Headed groups of entries, each its own subsection. */
export function EntryGroups({ groups }: { groups: EntryGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.heading} className="subsection">
          <h2 className="subhead">{g.heading}</h2>
          <EntryList entries={g.entries} />
        </section>
      ))}
    </>
  );
}
