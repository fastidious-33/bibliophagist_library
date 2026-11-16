import type { Metadata } from 'next';
import RoomPage, { EntryGroups, groupIndex } from '@/components/RoomPage';
import { filledGroups, getRoom } from '@/lib/sanity/content';

export const metadata: Metadata = {
  title: 'Writings',
  description: 'Book reviews, poetry and city guides by the librarian.',
};

// Content from Sanity; the webhook refreshes it on publish.
export const revalidate = 3600;

export default async function WritingsPage() {
  const room = await getRoom('writings');
  const groups = filledGroups(room);
  return (
    <RoomPage title="Writings" slot="librarianWritings" intro={room?.intro ?? []} index={groupIndex(groups)}>
      {groups.length > 0 ? <EntryGroups groups={groups} /> : <p className="room-empty">Writings to come.</p>}
    </RoomPage>
  );
}
