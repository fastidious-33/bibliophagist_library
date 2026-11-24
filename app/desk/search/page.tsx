import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { librarian } from '@/lib/desk';
import { searchDesk, type BookWhere } from '@/lib/desk-search';
import { formatCardNo, STATUS_COPY } from '@/lib/members';
import DeskHeader from '../DeskHeader';
import { day } from '../inbox/format';

export const metadata: Metadata = {
  title: 'Search · The desk',
  robots: { index: false, follow: false },
};

// Other people's details: never cached.
export const dynamic = 'force-dynamic';

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

/**
 * The desk's search (B4): from the box at the top of the frame. Members by
 * name, email, phone or card number, at any stage; books by title or call
 * number, with where each one is right now.
 */
export default async function DeskSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await librarian())) notFound();

  const query = first((await searchParams).q).slice(0, 100);
  const { members, books } = await searchDesk(query);
  const total = members.length + books.length;

  return (
    <section className="section section--flush desk">
      <DeskHeader title="Search" aside={query ? `${total} found for “${query}”` : undefined} />

      {!query ? (
        <p className="desk-empty">
          Search members by name, email, phone or card number (&ldquo;42&rdquo;), and books by title or call
          number.
        </p>
      ) : total === 0 ? (
        <p className="desk-empty">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          {members.length > 0 && (
            <section className="desk-queue" aria-labelledby="search-members">
              <h2 id="search-members" className="subhead">
                Members
              </h2>
              <table className="desk-table desk-stack">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Card</th>
                    <th scope="col">Stage</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Email</th>
                    <th scope="col">Books out</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td data-label="Name">
                        <Link href={`/desk/members/${m.id}`} prefetch={false}>
                          {m.name}
                        </Link>
                      </td>
                      <td data-label="Card" className="desk-num">
                        {m.card_no !== null ? formatCardNo(m.card_no) : '—'}
                      </td>
                      <td data-label="Stage">{STATUS_COPY[m.status].stamp}</td>
                      <td data-label="Phone">{m.phone}</td>
                      <td data-label="Email">{m.email}</td>
                      <td data-label="Books out" className="desk-num">
                        {m.books_out}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {books.length > 0 && (
            <section className="desk-queue" aria-labelledby="search-books">
              <h2 id="search-books" className="subhead">
                Books
              </h2>
              <ul className="desk-list search-books">
                {books.map((book) => (
                  <BookResult key={book._id} book={book} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}

/** A book and where it is: out with whom, set aside for whom, or on the shelf; and its line. */
function BookResult({ book }: { book: BookWhere }) {
  const person = (id: string | null, name: string) =>
    id ? (
      <Link href={`/desk/members/${id}`} prefetch={false}>
        {name}
      </Link>
    ) : (
      name
    );
  return (
    <li className="search-book">
      <span className="search-book-title">
        {book.title} <span className="call-number">{book.bookId ?? book._id}</span>
        {book.author && <span className="desk-meta"> · {book.author}</span>}
      </span>
      <span className="search-book-where">
        {book.out.map((loan, i) => (
          <span key={`out-${i}`}>
            Out with {person(loan.member_id, loan.name)}, due {day(loan.due_at)}
          </span>
        ))}
        {book.setAside.map((held, i) => (
          <span key={`aside-${i}`}>
            Set aside for {person(held.member_id, held.name)}
            {held.until ? ` until ${day(held.until)}` : ''}
          </span>
        ))}
        {book.onShelf && <span className="search-book-shelf">On the shelf</span>}
        {book.waiting > 0 && (
          <Link href="/desk/waitlist">
            {book.waiting} waiting
          </Link>
        )}
      </span>
      {book.onShelf && (
        <Link href={`/desk/lend?book=${encodeURIComponent(book._id)}`} className="btn btn-secondary search-book-lend">
          Lend
        </Link>
      )}
    </li>
  );
}
