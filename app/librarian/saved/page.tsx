import type { Metadata } from 'next';
import RoomPage, { EntryGroups, EntryList, groupIndex } from '@/components/RoomPage';
import OpenFromHash from '@/components/OpenFromHash';
import ToggleAll from '@/components/ToggleAll';
import { filledGroups, getRoom } from '@/lib/sanity/content';

export const metadata: Metadata = {
  title: 'Saved reading',
  description: 'Newsletters and bookmarked articles the librarian recommends.',
};

// Content from Sanity; the webhook refreshes it on publish.
export const revalidate = 3600;

export default async function SavedPage() {
  const [saved, bookmarks] = await Promise.all([getRoom('saved'), getRoom('bookmarks')]);
  const newsletters = filledGroups(saved);
  const topics = bookmarks?.groups ?? [];
  // The newsletter lists, then the bookmarks as one entry (they keep their
  // own topic list below).
  const index = [
    ...groupIndex(newsletters),
    { id: 'bookmarks', label: bookmarks?.title ?? 'Bookmarked articles' },
  ];

  return (
    <RoomPage title="Saved reading" slot="librarianSaved" intro={saved?.intro ?? []} index={index}>
      {/* Every list starts closed and opens from its heading; each section
          has an "Open all" / "Close all" of its own. */}
      {newsletters.length > 0 ? (
        <div id="newsletters" className="fold-section">
          <div className="fold-tools">
            <ToggleAll target="newsletters" />
          </div>
          <EntryGroups groups={newsletters} collapsible />
        </div>
      ) : (
        <p className="room-empty">Newsletters to come.</p>
      )}
      {saved?.note && <p className="room-note">{saved.note}</p>}

      <section id="bookmarks" className="subsection" aria-labelledby="bookmarks-heading">
        <div className="fold-heading">
          <h2 id="bookmarks-heading" className="subhead">
            {bookmarks?.title ?? 'Bookmarked articles'}
          </h2>
          {topics.length > 0 && <ToggleAll target="bookmarks" />}
        </div>
        {bookmarks?.intro.map((para) => (
          <p key={para} className="prose">
            {para}
          </p>
        ))}

        {topics.length > 0 ? (
          <>
            {/* A contents line: jumps to a topic and opens it. */}
            <nav aria-label="Bookmark topics">
              <ul className="topic-index">
                {topics.map((topic) => (
                  <li key={topic.id ?? topic.heading}>
                    <a href={`#${topic.id}`}>
                      {topic.heading} <span className="fold-count">({topic.entries.length})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Each topic keeps an anchor (its Studio "Anchor"), so Super's old
                topic pages can point here: OpenFromHash opens the one named in
                the address. */}
            <OpenFromHash />
            {topics.map((topic) => (
              <details key={topic.id ?? topic.heading} id={topic.id} className="bookmark-topic">
                <summary>
                  <h3>{topic.heading}</h3>
                  <span className="fold-count">{topic.entries.length}</span>
                </summary>
                {topic.entries.length > 0 ? (
                  <EntryList entries={topic.entries} />
                ) : (
                  <p className="room-empty">Bookmarks to come.</p>
                )}
              </details>
            ))}
          </>
        ) : (
          <p className="room-empty">Bookmarks to come.</p>
        )}
      </section>
    </RoomPage>
  );
}
