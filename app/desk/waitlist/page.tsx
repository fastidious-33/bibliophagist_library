import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { librarian } from '@/lib/desk';
import { formatCardNo, STATUS_COPY } from '@/lib/members';
import { firstEligible, getWaitlists, type Line } from '@/lib/waitlist';
import { moveDownAction, moveUpAction, removeFromLineAction, setAsideFromLineAction } from '../actions';
import DeskHeader from '../DeskHeader';
import { day } from '../inbox/format';
import InboxButton from '../inbox/InboxButton';

export const metadata: Metadata = {
  title: 'Waitlist · The desk',
  robots: { index: false, follow: false },
};

// Other people's details: never cached.
export const dynamic = 'force-dynamic';

/**
 * The Waitlist (PLAN.md "Account and desk rework", B4): every waited-for
 * book with its line in order. First come, first served, with the
 * librarian's controls: set it aside for anyone in line (while it's on the
 * shelf), move people up or down, remove someone, or lend it to someone
 * else, which ignores the line.
 */
export default async function WaitlistPage() {
  if (!(await librarian())) notFound();

  const lines = await getWaitlists();
  const people = lines.reduce((sum, line) => sum + line.entries.length, 0);

  return (
    <section className="section section--flush desk">
      <DeskHeader
        title="Waitlist"
        aside={`${lines.length} ${lines.length === 1 ? 'book' : 'books'} · ${people} waiting`}
      />
      {lines.length === 0 ? (
        <p className="desk-empty">
          No one is waiting for a book. Members join a book&rsquo;s waitlist from its page while it&rsquo;s out.
        </p>
      ) : (
        <ul className="waitlist-books">
          {lines.map((line) => (
            <WaitlistBook key={line.book_id} line={line} />
          ))}
        </ul>
      )}
    </section>
  );
}

function WaitlistBook({ line }: { line: Line }) {
  const suggested = firstEligible(line);
  return (
    <li className="waitlist-book">
      <div className="waitlist-book-head">
        <h2 className="waitlist-book-title">
          {line.book_title} <span className="call-number">{line.book_id}</span>
        </h2>
        <span className={`inbox-tag${line.on_shelf ? '' : ' is-out'}`}>
          {line.on_shelf ? 'On the shelf' : line.due_at ? `Out · due ${day(line.due_at)}` : 'Set aside'}
        </span>
      </div>
      {line.on_shelf && (
        <p className="waitlist-hint">
          {suggested
            ? `It’s back. ${suggested.name} is first in line who can borrow.`
            : 'It’s back, but everyone waiting is paused.'}
        </p>
      )}
      <ol className="waitlist-line">
        {line.entries.map((entry, index) => {
          const fields: [string, string][] = [['waitId', entry.id]];
          return (
            <li key={entry.id} className={entry.id === suggested?.id && line.on_shelf ? 'is-next' : undefined}>
              <span className="inbox-line-place">{index + 1}</span>
              <span className="waitlist-who">
                <Link href={`/desk/members/${entry.member_id}`} prefetch={false}>
                  {entry.name}
                </Link>
                {entry.card_no !== null && <span className="desk-meta"> · {formatCardNo(entry.card_no)}</span>}
                {entry.status !== 'active' && (
                  <span className="inbox-tag is-out">{STATUS_COPY[entry.status].stamp}</span>
                )}
                <span className="desk-meta waitlist-since">since {day(entry.created_at)}</span>
              </span>
              <span className="waitlist-controls">
                {line.on_shelf && entry.status === 'active' && (
                  <InboxButton
                    action={setAsideFromLineAction}
                    fields={fields}
                    label="Set aside"
                    busy="…"
                    stamp="Set aside"
                    variant={entry.id === suggested?.id ? 'primary' : 'secondary'}
                  />
                )}
                {index > 0 && (
                  <InboxButton action={moveUpAction} fields={fields} label="↑" busy="…" stamp="Moved" variant="secondary" />
                )}
                {index < line.entries.length - 1 && (
                  <InboxButton action={moveDownAction} fields={fields} label="↓" busy="…" stamp="Moved" variant="secondary" />
                )}
                <InboxButton
                  action={removeFromLineAction}
                  fields={fields}
                  label="Remove"
                  busy="…"
                  stamp="Removed"
                  variant="secondary"
                  confirm={`Take ${entry.name} out of the line for “${line.book_title}”?`}
                />
              </span>
            </li>
          );
        })}
      </ol>
      <p className="waitlist-foot">
        <Link href={`/desk/lend?book=${encodeURIComponent(line.book_id)}`}>Lend it to someone else</Link>
        <span className="desk-meta"> (ignores the line)</span>
      </p>
    </li>
  );
}
