import type { Metadata } from 'next';
import RoomPage, { EntryGroups, EntryList } from '@/components/RoomPage';
import OpenFromHash from '@/components/OpenFromHash';
import ToggleAll from '@/components/ToggleAll';
import { BOOKMARKS_INTRO, BOOKMARK_TOPICS, NEWSLETTERS, SAVED_INTRO, SAVED_PS } from '@/lib/librarian';

export const metadata: Metadata = {
  title: 'Saved reading',
  description: 'Newsletters and bookmarked articles the librarian recommends.',
};

export default function SavedPage() {
  return (
    <RoomPage title="Saved reading" slot="librarianSaved" intro={SAVED_INTRO}>
      {/* Every list starts closed and opens from its heading; each section
          has an "Open all" / "Close all" of its own. */}
      <div id="newsletters" className="fold-section">
        <div className="fold-tools">
          <ToggleAll target="newsletters" />
        </div>
        <EntryGroups groups={NEWSLETTERS} collapsible />
      </div>
      <p className="room-note">{SAVED_PS}</p>

      <section id="bookmarks" className="subsection" aria-labelledby="bookmarks-heading">
        <div className="fold-heading">
          <h2 id="bookmarks-heading" className="subhead">
            Bookmarked articles
          </h2>
          <ToggleAll target="bookmarks" />
        </div>
        <p className="prose">{BOOKMARKS_INTRO}</p>

        {/* A contents line: jumps to a topic and opens it. */}
        <nav aria-label="Bookmark topics">
          <ul className="topic-index">
            {BOOKMARK_TOPICS.map((topic) => (
              <li key={topic.id}>
                <a href={`#${topic.id}`}>
                  {topic.title} <span className="fold-count">({topic.entries.length})</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Each topic keeps an anchor, so Super's old topic pages can point
            here: OpenFromHash opens the one named in the address. */}
        <OpenFromHash />
        {BOOKMARK_TOPICS.map((topic) => (
          <details key={topic.id} id={topic.id} className="bookmark-topic">
            <summary>
              <h3>{topic.title}</h3>
              <span className="fold-count">{topic.entries.length}</span>
            </summary>
            {topic.entries.length > 0 ? (
              <EntryList entries={topic.entries} />
            ) : (
              <p className="room-empty">Bookmarks to come.</p>
            )}
          </details>
        ))}
      </section>
    </RoomPage>
  );
}
