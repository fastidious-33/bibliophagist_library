import type { Metadata } from 'next';
import RoomPage, { EntryGroups } from '@/components/RoomPage';
import { WRITINGS, WRITINGS_INTRO } from '@/lib/librarian';

export const metadata: Metadata = {
  title: 'Writings',
  description: 'Book reviews, poetry and city guides by the librarian.',
};

export default function WritingsPage() {
  return (
    <RoomPage title="Writings" slot="librarianWritings" intro={WRITINGS_INTRO}>
      <EntryGroups groups={WRITINGS} />
    </RoomPage>
  );
}
