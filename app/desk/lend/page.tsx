import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeskHeader from '../DeskHeader';
import { librarian } from '@/lib/desk';
import {
  addMonths,
  bookHolds,
  DEFAULT_LOAN_MONTHS,
  getBook,
  getLendMembers,
  MAX_LEND_BOOKS,
  MAX_LOAN_MONTHS,
  searchBooks,
  todayInIndia,
  type BookChoice,
} from '@/lib/desk-loans';
import { getOpenRequest } from '@/lib/desk-requests';
import { STATUS_COPY } from '@/lib/members';
import { lend } from '../actions';
import DeskForm from '../DeskForm';
import { day } from '../inbox/format';

export const metadata: Metadata = {
  title: 'Lend · The desk',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

/**
 * Lend (M3 A2; several books in one handover since B4): add books one by
 * one (call number or title, from the catalog's cached list), then who,
 * until when and how, once for all of them. The address holds the list:
 * ?books=B12,B40, plus ?member= to start with someone (from their file)
 * and ?request= to start from a request (its book, member, handover and
 * address fill in). Lending marks any request the member had open for
 * these books as lent.
 */
export default async function LendPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await librarian())) notFound();

  const params = await searchParams;
  const query = first(params.q).slice(0, 100);
  const requestParam = first(params.request);
  const request = /^[0-9a-f-]{36}$/i.test(requestParam) ? await getOpenRequest(requestParam) : null;
  const memberId = request?.member_id ?? first(params.member);
  const bookIds = [
    ...new Set(
      [request?.book_id ?? '', first(params.book), ...first(params.books).split(',')]
        .map((id) => id.trim().slice(0, 100))
        .filter(Boolean),
    ),
  ].slice(0, MAX_LEND_BOOKS);

  const [chosen, results, members, holds] = await Promise.all([
    Promise.all(bookIds.map((id) => getBook(id))),
    query ? searchBooks(query) : Promise.resolve([] as BookChoice[]),
    getLendMembers(),
    bookHolds(bookIds),
  ]);
  const books = chosen.filter((book): book is BookChoice => book !== null);
  const full = books.length >= MAX_LEND_BOOKS;
  const anyHeld = books.some((book) => {
    const hold = holds.get(book._id);
    return (hold?.out.length ?? 0) + (hold?.setAside.length ?? 0) > 0;
  });
  const today = todayInIndia();

  /** This page's address with a different list of books (and search). */
  function href(ids: string[], q = ''): string {
    const next = new URLSearchParams();
    if (ids.length > 0) next.set('books', ids.join(','));
    if (memberId) next.set('member', memberId);
    if (request) next.set('request', request.id);
    if (q) next.set('q', q);
    const qs = next.toString();
    return qs ? `/desk/lend?${qs}` : '/desk/lend';
  }
  const ids = books.map((book) => book._id);

  return (
    <section className="section section--flush desk">
      <DeskHeader title="Lend" aside={books.length > 0 ? `${books.length} ${books.length === 1 ? 'book' : 'books'}` : undefined} />

      {request && (
        <p className="desk-warning" role="note">
          From {request.member_name}&rsquo;s request of {day(request.created_at)}
          {request.member_note && <>: &ldquo;{request.member_note}&rdquo;</>}. Lending marks it lent.
        </p>
      )}

      <section className="desk-queue" aria-labelledby="lend-books">
        <h2 id="lend-books" className="subhead">
          The books
        </h2>
        {books.length > 0 && (
          <ul className="desk-list lend-books">
            {books.map((book) => {
              const hold = holds.get(book._id);
              return (
                <li key={book._id}>
                  <span>
                    <strong>{book.title}</strong> {book.bookId && <span className="call-number">{book.bookId}</span>}
                    {book.author && <span className="desk-meta"> · {book.author}</span>}
                    {hold?.out.map((loan, i) => (
                      <span key={`out-${i}`} className="desk-table-note">
                        Out with {loan.name}, due {day(loan.due_at)}
                      </span>
                    ))}
                    {hold?.setAside.map((held, i) => (
                      <span key={`aside-${i}`} className="desk-table-note">
                        Set aside for {held.name}
                      </span>
                    ))}
                  </span>
                  <Link href={href(ids.filter((id) => id !== book._id), query)} className="desk-link">
                    Remove
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {full ? (
          <p className="desk-empty">That&rsquo;s {MAX_LEND_BOOKS} books, the most in one handover.</p>
        ) : (
          <>
            <form className="desk-search" role="search" action="/desk/lend">
              {ids.length > 0 && <input type="hidden" name="books" value={ids.join(',')} />}
              {memberId && <input type="hidden" name="member" value={memberId} />}
              {request && <input type="hidden" name="request" value={request.id} />}
              <label>
                <span className="visually-hidden">Call number or title</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder={books.length > 0 ? 'Add another: call number or title' : 'Call number (B123) or title'}
                  autoFocus={books.length === 0}
                />
              </label>
              <button type="submit" className="btn btn-secondary">
                Find
              </button>
            </form>
            {query &&
              (results.length === 0 ? (
                <p className="desk-empty">No book matches &ldquo;{query}&rdquo;.</p>
              ) : (
                <ul className="desk-list">
                  {results.map((result) => (
                    <li key={result._id}>
                      <span>
                        {result.title} {result.bookId && <span className="call-number">{result.bookId}</span>}
                        {result.author && <span className="desk-meta"> · {result.author}</span>}
                      </span>
                      {ids.includes(result._id) ? (
                        <span className="desk-meta">Added</span>
                      ) : (
                        <Link href={href([...ids, result._id])} className="desk-link">
                          Add
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ))}
          </>
        )}
      </section>

      {books.length > 0 && (
        <section className="desk-queue" aria-labelledby="lend-details">
          <h2 id="lend-details" className="subhead">
            Who, until when, how
          </h2>
          <DeskForm
            action={lend}
            submit={books.length === 1 ? 'Lend it' : `Lend ${books.length} books`}
            busy="Lending…"
            className="desk-form"
          >
            {books.map((book) => (
              <input key={book._id} type="hidden" name="bookId" value={book._id} />
            ))}
            <div className="desk-fields">
              <label>
                <span>Member</span>
                <select name="memberId" defaultValue={memberId} required>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({STATUS_COPY[m.status].stamp})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  Due (usually {DEFAULT_LOAN_MONTHS} month; at most {MAX_LOAN_MONTHS})
                </span>
                <input name="dueOn" type="date" required min={today} defaultValue={addMonths(today, DEFAULT_LOAN_MONTHS)} />
              </label>
              <label className="desk-check">
                <input type="checkbox" name="allowLonger" />
                <span>Allow longer than {MAX_LOAN_MONTHS} months</span>
              </label>
              <fieldset className="desk-field-wide desk-radios">
                <legend>Handover</legend>
                <label>
                  <input type="radio" name="handover" value="in_person" defaultChecked={request?.handover !== 'courier'} />{' '}
                  In person
                </label>
                <label>
                  <input type="radio" name="handover" value="courier" defaultChecked={request?.handover === 'courier'} /> By
                  courier
                </label>
              </fieldset>
              <label className="desk-field-wide">
                <span>Courier address (only for a courier; cleared when it&rsquo;s back)</span>
                <textarea name="courierAddress" rows={2} maxLength={500} defaultValue={request?.courier_address ?? ''} />
              </label>
              <label className="desk-field-wide">
                <span>Your note on {books.length === 1 ? 'this loan' : 'these loans'} (only you see it)</span>
                <input name="note" maxLength={500} autoComplete="off" />
              </label>
              {anyHeld && (
                <label className="desk-check desk-field-wide">
                  <input type="checkbox" name="lendAnyway" />
                  <span>Lend anyway: I have another copy of the ones marked out or set aside</span>
                </label>
              )}
              <label className="desk-check desk-field-wide">
                <input type="checkbox" name="overLimit" />
                <span>Over their limit: lend anyway (their own book limit is on their file)</span>
              </label>
            </div>
          </DeskForm>
        </section>
      )}
    </section>
  );
}
