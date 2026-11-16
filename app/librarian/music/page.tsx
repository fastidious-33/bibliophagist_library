import type { Metadata } from 'next';
import RoomPage, { EntryGroups, groupIndex } from '@/components/RoomPage';
import { SPOTIFY_PROFILE } from '@/lib/librarian';
import { filledGroups, getRoom } from '@/lib/sanity/content';

export const metadata: Metadata = {
  title: 'Music',
  description: 'The librarian’s playlists on Spotify.',
};

// Content from Sanity; the webhook refreshes it on publish.
export const revalidate = 3600;

// Links only, no embedded players: no Spotify script loads on the page.
export default async function MusicPage() {
  const room = await getRoom('music');
  const groups = filledGroups(room);
  return (
    <RoomPage title="Music" slot="librarianMusic" intro={room?.intro ?? []} index={groupIndex(groups)}>
      {groups.length > 0 ? <EntryGroups groups={groups} /> : <p className="room-empty">Playlists coming soon.</p>}
      <p className="mt-md">
        <a href={SPOTIFY_PROFILE} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          Follow my playlists on Spotify &rarr;
        </a>
      </p>
    </RoomPage>
  );
}
