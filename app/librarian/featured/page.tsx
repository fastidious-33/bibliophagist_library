import type { Metadata } from 'next';
import RoomPage, { EntryGroups, groupIndex } from '@/components/RoomPage';
import { filledGroups, getRoom } from '@/lib/sanity/content';

export const metadata: Metadata = {
  title: 'Featured in',
  description: 'Where the librarian has turned up: Instagram, YouTube and the news.',
};

// Content from Sanity; the webhook refreshes it on publish.
export const revalidate = 3600;

export default async function FeaturedPage() {
  const room = await getRoom('featured');
  const groups = filledGroups(room);
  return (
    <RoomPage title="Featured in" slot="librarianFeatured" intro={room?.intro ?? []} index={groupIndex(groups)}>
      {groups.length > 0 ? <EntryGroups groups={groups} /> : <p className="room-empty">Features to come.</p>}
    </RoomPage>
  );
}
