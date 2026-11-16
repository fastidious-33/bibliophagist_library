import type { ReactNode } from 'react';
import Link from 'next/link';
import Painting from '@/components/Painting';
import Breadcrumbs, { LIBRARIAN } from '@/components/Breadcrumbs';
import PageIndex, { type PageIndexItem } from '@/components/PageIndex';
import type { PaintingSlot } from '@/lib/paintings';
import type { Entry, EntryGroup } from '@/lib/sanity/content';

/** A room's groups as "On this page" entries (the ones with an anchor). */
export function groupIndex(groups: EntryGroup[]): PageIndexItem[] {
  return groups.filter((g) => g.id).map((g) => ({ id: g.id!, label: g.heading }));
}

/**
 * The shared frame for a room in the Librarian section: the trail back to
 * the Librarian, title, painting beside the intro, "On this page" (when the
 * room passes an `index` with enough entries), the room's content, and the
 * way back.
 */
export default function RoomPage({
  title,
  slot,
  intro,
  index = [],
  children,
}: {
  title: string;
  slot: PaintingSlot;
  intro: string[];
  index?: PageIndexItem[];
  children: ReactNode;
}) {
  return (
    <section className="section section--flush">
      <Breadcrumbs trail={[LIBRARIAN, { label: title }]} />
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

      <PageIndex items={index} />

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

/**
 * Headed groups of entries, each its own subsection. `collapsible`: each
 * starts closed and opens from its heading, which shows the link count.
 * Each takes its anchor (`id`, the Studio subheading's) so "On this page"
 * and links from elsewhere can jump to it.
 */
export function EntryGroups({ groups, collapsible = false }: { groups: EntryGroup[]; collapsible?: boolean }) {
  return (
    <>
      {groups.map((g) =>
        collapsible ? (
          <details key={g.heading} id={g.id} className="subsection entry-fold">
            <summary>
              <h2 className="subhead">{g.heading}</h2>
              <span className="fold-count">{g.entries.length}</span>
            </summary>
            <EntryList entries={g.entries} />
          </details>
        ) : (
          <section key={g.heading} id={g.id} className="subsection">
            <h2 className="subhead">{g.heading}</h2>
            <EntryList entries={g.entries} />
          </section>
        ),
      )}
    </>
  );
}
