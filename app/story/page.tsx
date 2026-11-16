import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBooks } from '@/lib/search';
import Painting from '@/components/Painting';
import Breadcrumbs, { BROWSE } from '@/components/Breadcrumbs';
import { glance } from '@/lib/story';
import Story from './Story';

export const metadata: Metadata = {
  title: 'The Story of the Shelves',
  description:
    'The story of the library’s shelves: what they’re made of, how the genres compare, who wrote the books, when, and how long they run.',
};

// Built from the cached book list (tag `books`), which the Sanity webhook
// refreshes on publish; this is only the safety net.
export const revalidate = 86400;

// Chapter 1's paragraph. A DRAFT for you to rewrite in your own voice; the
// other chapters' lines are generated from the data (commentary() in lib/story.ts).
const INTRO =
  'A library gathered one book at a time ends up with a shape nobody planned. This is the shape of this one: what the shelves hold, who wrote it, when, and at what length. Pick a wing or a genre in the wheel below, and the rest of the story retells itself for it.';

const number = (n: number) => n.toLocaleString('en-GB');
const plural = (n: number, word: string, many = `${word}s`) => `${number(n)} ${n === 1 ? word : many}`;

/**
 * The server draws the whole, unfiltered story; Story (a client component)
 * gets the book list and does any filtering in the browser, so this page
 * stays cached whatever selection a visitor makes.
 */
export default async function StoryPage() {
  // Not caught on purpose: a failed load throws to app/story/error.tsx, so a
  // Sanity blip is never cached as an "empty" story for the revalidate window.
  const books = await getAllBooks();

  const g = glance(books);
  // Dated on the server, when the page was built, so the browser doesn't
  // re-date it (and so it says when the numbers were counted).
  const tallied = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className="section section--flush">
      <Breadcrumbs trail={[BROWSE, { label: 'The Story of the Shelves' }]} />
      <div className="section-heading">
        <h1>The Story of the Shelves</h1>
      </div>

      <div className="genre-hero ledger-hero">
        <Painting slot="story" priority sizes="(max-width: 760px) 100vw, 420px" />
        <div>
          <p className="prose prose-lg">{INTRO}</p>
          {g.books > 0 && (
            <p className="prose">
              {plural(g.books, 'book')} by {plural(g.authors, 'author')}
              {g.oldest !== undefined && g.newest !== undefined && `, first published between ${g.oldest} and ${g.newest}`}.
            </p>
          )}
        </div>
      </div>

      {/* A failed load throws to error.tsx, so an empty list here really is
          an empty library. */}
      {g.books === 0 ? (
        <p className="room-empty">No books are on the shelves yet.</p>
      ) : (
        <Story books={books} tallied={tallied} />
      )}

      <div className="back-row">
        <Link href="/catalog" className="btn btn-secondary">
          &larr; Back to the catalog
        </Link>
      </div>
    </section>
  );
}
