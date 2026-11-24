import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Painting from '@/components/Painting';
import { librarian } from '@/lib/desk';
import { getInbox, type InboxItem, type InboxKind } from '@/lib/desk-inbox';
import { daysLate } from '@/lib/desk-loans';
import type { ChangeableField } from '@/lib/members';
import InboxCard, { KIND_LABEL } from './inbox/InboxCard';
import InboxShell, { type InboxRow } from './inbox/InboxShell';
import { waited } from './inbox/format';

export const metadata: Metadata = {
  title: 'Inbox · The desk',
  robots: { index: false, follow: false },
};

// Other people's details: never cached.
export const dynamic = 'force-dynamic';

/** The filter chips, in this order; a chip shows only when it has something. */
const CHIPS: { kind: InboxKind; label: string }[] = [
  { kind: 'overdue', label: 'Overdue' },
  { kind: 'requests', label: 'Requests' },
  { kind: 'signup', label: 'Sign-ups' },
  { kind: 'payment', label: 'Payments' },
  { kind: 'set_aside', label: 'Pickups' },
  { kind: 'turn', label: 'Waitlist' },
  { kind: 'more_time', label: 'More time' },
  { kind: 'change', label: 'Details' },
];

const KINDS = CHIPS.map((chip) => chip.kind) as string[];

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

const FIELD_LABEL: Record<ChangeableField, string> = {
  name: 'name',
  phone: 'phone',
  location: 'location',
  instagram: 'Instagram',
  college: 'college',
  linkedin: 'LinkedIn',
};

/** What a row says about its item: who, what, and how long it's waited. */
function toRow(item: InboxItem): InboxRow {
  const base = { key: item.key, kind: item.kind, label: KIND_LABEL[item.kind], who: item.person.name, urgent: false };
  const when = waited(item.since);
  switch (item.kind) {
    case 'signup':
      return {
        ...base,
        what: item.signUp.location || item.signUp.email,
        when,
        tick: { name: 'memberId', ids: [item.signUp.id] },
      };
    case 'payment':
      return {
        ...base,
        what: `Owes ${item.owes.map((k) => (k === 'deposit' ? 'deposit' : 'membership')).join(' + ')}`,
        when,
      };
    case 'requests':
      return {
        ...base,
        what:
          item.requests.length === 1 ? item.requests[0].book_title : `${item.requests.length} books`,
        when,
        tick: { name: 'requestId', ids: item.requests.map((r) => r.id) },
      };
    case 'set_aside':
      return {
        ...base,
        label: item.stage === 'release' ? 'Not collected' : 'Nudge?',
        what: item.request.book_title,
        when,
      };
    case 'overdue': {
      const late = daysLate(item.loan.due_at);
      return { ...base, urgent: true, what: item.loan.book_title, when: `${late}d late` };
    }
    case 'change':
      return {
        ...base,
        what: (Object.keys(item.change.new_values) as ChangeableField[]).map((f) => FIELD_LABEL[f]).join(', '),
        when,
      };
    case 'more_time':
      return { ...base, what: `${item.loan.book_title} · +${item.ask.extra}`, when };
    case 'turn':
      return {
        ...base,
        who: item.line.book_title,
        what: item.suggested ? `${item.suggested.name} is first in line` : 'Everyone waiting is paused',
        when,
      };
  }
}

/**
 * The desk's inbox (PLAN.md "Account and desk rework", B3c): only what
 * waits on you, overdue first, then oldest first. Filter chips; the list
 * and the open item's index card side by side on a laptop; on a phone the
 * list, then the item full screen (?item= in the address, so Back works).
 */
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await librarian())) notFound();

  const params = await searchParams;
  const all = await getInbox();
  const counts = new Map<InboxKind, number>();
  for (const item of all) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);

  const typeParam = first(params.type);
  const type = KINDS.includes(typeParam) ? (typeParam as InboxKind) : '';
  const items = type ? all.filter((item) => item.kind === type) : all;
  const itemParam = first(params.item);
  const selected = all.find((item) => item.key === itemParam) ?? items[0] ?? null;

  const chipHref = (kind: InboxKind | '') => (kind ? `/desk?type=${kind}` : '/desk');

  return (
    <section className="section section--flush desk">
      <InboxHeader count={all.length} />

      {all.length > 0 && (
        <>
          <nav className="inbox-chips-row" aria-label="Show">
            <Link href={chipHref('')} className="inbox-filter" aria-current={type === '' ? 'page' : undefined}>
              All <span className="inbox-filter-count">{all.length}</span>
            </Link>
            {CHIPS.filter((chip) => counts.has(chip.kind)).map((chip) => (
              <Link
                key={chip.kind}
                href={chipHref(chip.kind)}
                className={`inbox-filter${chip.kind === 'overdue' ? ' is-urgent' : ''}`}
                aria-current={type === chip.kind ? 'page' : undefined}
              >
                {chip.label} <span className="inbox-filter-count">{counts.get(chip.kind)}</span>
              </Link>
            ))}
          </nav>

          {items.length === 0 ? (
            <p className="desk-empty">
              Nothing of this kind is waiting. <Link href="/desk">Show everything</Link>.
            </p>
          ) : (
            <InboxShell rows={items.map(toRow)} selected={selected?.key ?? null} type={type} open={Boolean(itemParam)}>
              {selected && <InboxCard key={selected.key} item={selected} />}
            </InboxShell>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The Inbox's header. With items waiting: a plain card saying how many and
 * what the desk is for (folded away on a phone), since the desk is a work
 * surface. With nothing waiting: Van Gogh's noon rest, centred, with the
 * words underneath; the desk's one painting, kept for when the work is done.
 */
function InboxHeader({ count }: { count: number }) {
  if (count === 0) {
    return (
      <header className="inbox-rest">
        <Painting slot="deskEmpty" className="inbox-rest-painting" priority sizes="(max-width: 700px) 100vw, 640px" />
        <span className="inbox-card-kind">The desk</span>
        <h1 className="inbox-header-title">Inbox</h1>
        <p className="inbox-rest-line">All caught up. Go read something.</p>
      </header>
    );
  }

  const about = (
    <p className="inbox-about-text">
      Everything here is waiting on you: sign-ups to look over, payments to mark, books to set aside or chase,
      and members asking for more time or a change to their details. Act on one and the next comes up.
    </p>
  );
  return (
    <header className="inbox-header-card">
      <span className="inbox-card-kind">The desk</span>
      <h1 className="inbox-header-title">Inbox</h1>
      <p className="inbox-header-count">{count} waiting on you</p>
      <div className="inbox-about-wide">{about}</div>
      <details className="inbox-about-fold">
        <summary className="text-button">About the desk</summary>
        {about}
      </details>
    </header>
  );
}
