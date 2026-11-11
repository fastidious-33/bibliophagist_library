import type { Metadata } from 'next';
import RoomPage, { EntryGroups, EntryList } from '@/components/RoomPage';
import { BOOKMARKS_INTRO, BOOKMARK_TOPICS, NEWSLETTERS, SAVED_INTRO, SAVED_PS } from '@/lib/librarian';

export const metadata: Metadata = {
  title: 'Saved reading',
  description: 'Newsletters and bookmarked articles the librarian recommends.',
};

export default function SavedPage() {
  return (
    <RoomPage title="Saved reading" slot="librarianSaved" intro={SAVED_INTRO}>
      <EntryGroups groups={NEWSLETTERS} />
      <p className="room-note">{SAVED_PS}</p>

      <section className="subsection" aria-labelledby="bookmarks-heading">
        <h2 id="bookmarks-heading" className="subhead">
          Bookmarked articles
        </h2>
        <p className="prose">{BOOKMARKS_INTRO}</p>
        {/* Each topic keeps an anchor, so Super's old topic pages can point here. */}
        {BOOKMARK_TOPICS.map((topic) => (
          <section key={topic.id} id={topic.id} className="bookmark-topic">
            <h3>{topic.title}</h3>
            {topic.entries.length > 0 ? (
              <EntryList entries={topic.entries} />
            ) : (
              <p className="room-empty">Bookmarks to come.</p>
            )}
          </section>
        ))}
      </section>
    </RoomPage>
  );
}
