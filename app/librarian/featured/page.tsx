import type { Metadata } from 'next';
import RoomPage, { EntryGroups } from '@/components/RoomPage';
import { FEATURED, FEATURED_INTRO } from '@/lib/librarian';

export const metadata: Metadata = {
  title: 'Featured in',
  description: 'Where the librarian has turned up: Instagram, YouTube and the news.',
};

export default function FeaturedPage() {
  return (
    <RoomPage title="Featured in" slot="librarianFeatured" intro={FEATURED_INTRO}>
      <EntryGroups groups={FEATURED} />
    </RoomPage>
  );
}
