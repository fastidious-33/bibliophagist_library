import type { Metadata } from 'next';
import RoomPage, { EntryList } from '@/components/RoomPage';
import { MUSIC_INTRO, PLAYLISTS, SPOTIFY_PROFILE } from '@/lib/librarian';

export const metadata: Metadata = {
  title: 'Music',
  description: 'The librarian’s playlists on Spotify.',
};

// Links only, no embedded players: no Spotify script loads on the page.
export default function MusicPage() {
  return (
    <RoomPage title="Music" slot="librarianMusic" intro={MUSIC_INTRO}>
      <section className="subsection" aria-labelledby="playlists-heading">
        <h2 id="playlists-heading" className="subhead">
          Playlists
        </h2>
        {PLAYLISTS.length > 0 ? (
          <EntryList entries={PLAYLISTS} />
        ) : (
          <p className="room-empty">Playlists coming soon.</p>
        )}
        <p className="mt-md">
          <a href={SPOTIFY_PROFILE} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            Follow my playlists on Spotify &rarr;
          </a>
        </p>
      </section>
    </RoomPage>
  );
}
