import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import ClothPlate from '@/components/ClothPlate';
import Painting from '@/components/Painting';
import SignOutButton from '@/components/SignOutButton';
import {
  DEPOSIT_AMOUNT,
  getAccountRecords,
  SUBSCRIPTION_AMOUNT,
  UPI_ID,
  type AccountRecords,
  type EndedRequest,
  type Loan,
  type OpenRequest,
  type Payment,
  type PaymentKind,
} from '@/lib/account';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import { isDatabaseConfigured } from '@/lib/db';
import { isOverdue } from '@/lib/desk-loans';
import { findMemberForLogin, formatCardNo, STATUS_COPY, type Member, type MemberStatus } from '@/lib/members';
import { MAX_MORE_TIME_ASKS } from '@/lib/more-time';
import { isSanityConfigured } from '@/lib/sanity/client';
import { getAllBooks } from '@/lib/search/sanity';
import { joinFormUrl } from '@/lib/site';
import { MAX_WAITLISTS, type WaitlistPlace } from '@/lib/waitlist';
import AskMoreTime from './AskMoreTime';
import CancelRequest from './CancelRequest';
import CopyText from './CopyText';
import DeleteAccount, { AccountCard } from './DeleteAccount';
import DetailsCard from './DetailsCard';
import { books, formatDate, formatDay, formatMonth, ordinal, yearOf } from './format';
import LeaveWaitlist from './LeaveWaitlist';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

// Personal to whoever is signed in: never cached.
export const dynamic = 'force-dynamic';

/**
 * Your account (M3, reworked in PLAN.md "Account and desk rework", B2):
 * the borrower's card (name, stage, card number, Sign out), one "What's
 * next" line, then tabs: Books · Waitlist · Payments · Details. The tab is
 * in the address (?tab=payments) so emails can link to one.
 *
 * Pending, declined and closed accounts get no tabs, just their details.
 * Approved members open on Payments; active and paused ones on Books;
 * only they see Waitlist.
 *
 * proxy.ts sends signed-out visitors to /signin before this runs; the check
 * below is the page's own guard, so it never shows anyone else's card.
 */

const TAB_LABEL = { books: 'Books', waitlist: 'Waitlist', payments: 'Payments', details: 'Details' } as const;
type Tab = keyof typeof TAB_LABEL;

function tabsFor(status: MemberStatus): Tab[] {
  if (status === 'active' || status === 'paused') return ['books', 'waitlist', 'payments', 'details'];
  if (status === 'approved') return ['books', 'payments', 'details'];
  return [];
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isAuthConfigured || !isDatabaseConfigured) notFound();

  const { data: session } = await getAuth().getSession();
  const login = session?.user;
  if (!login) redirect('/signin');

  const member = await findMemberForLogin(login);
  if (!member) {
    return (
      <section className="section section--flush account-page">
        <div className="account">
          <NotJoined email={login.email} />
        </div>
      </section>
    );
  }

  const params = await searchParams;
  const records = await getAccountRecords(member.id);
  const tabs = tabsFor(member.status);
  const asked = first(params.tab) as Tab;
  const tab: Tab | null =
    tabs.length === 0 ? null : tabs.includes(asked) ? asked : member.status === 'approved' ? 'payments' : 'books';
  // Covers and book-page links, from the catalog's cached list.
  const catalog = tab === 'books' || tab === 'waitlist' ? await catalogLookup() : new Map<string, CatalogEntry>();

  const details = (
    <DetailsTab member={member} records={records} canRequest={member.status !== 'declined' && member.status !== 'left'} />
  );

  return (
    <section className="section section--flush account-page">
      <AccountCard>
        <HeaderCard member={member} />
        <WhatsNext member={member} records={records} />
        {tab ? (
          <div className="account-drawer">
            <nav className="account-tabs" aria-label="Your account">
              {tabs.map((t) => {
                const count =
                  t === 'books'
                    ? records.loansOut.length + records.requests.length
                    : t === 'waitlist'
                      ? records.waitlist.length
                      : 0;
                return (
                  <Link
                    key={t}
                    href={`/account?tab=${t}`}
                    className="account-tab"
                    aria-current={t === tab ? 'page' : undefined}
                    scroll={false}
                  >
                    {TAB_LABEL[t]}
                    {count > 0 && <span className="account-tab-count">{count}</span>}
                  </Link>
                );
              })}
            </nav>
            <div className="account-panel">
              {tab === 'books' && (
                <BooksTab
                  member={member}
                  records={records}
                  catalog={catalog}
                  allHistory={first(params.history) === 'all'}
                />
              )}
              {tab === 'waitlist' && (
                <WaitlistTab places={records.waitlist} limit={member.borrow_limit} catalog={catalog} />
              )}
              {tab === 'payments' && (
                <Payments payments={records.payments} awaitingPayment={member.status === 'approved'} />
              )}
              {tab === 'details' && details}
            </div>
          </div>
        ) : (
          <div className="account-panel">{details}</div>
        )}
      </AccountCard>
    </section>
  );
}

// ---------- The catalog's cached list ----------

interface CatalogEntry {
  slug: string;
  coverUrl: string;
}

/**
 * Every book's page and cover, by id, from the catalog's cached list
 * (lib/search/sanity.ts): no Sanity read of its own. If Sanity can't be
 * reached and nothing is cached, books show without links or covers.
 */
async function catalogLookup(): Promise<Map<string, CatalogEntry>> {
  if (!isSanityConfigured) return new Map();
  try {
    const all = await getAllBooks();
    return new Map(all.map((book) => [book.id, { slug: book.slug, coverUrl: book.coverUrl ?? '' }]));
  } catch (error) {
    console.error('/account: the catalog list could not be loaded', error);
    return new Map();
  }
}

function BookName({ id, title, catalog }: { id: string; title: string; catalog: Map<string, CatalogEntry> }) {
  const slug = catalog.get(id)?.slug;
  return (
    <span className="account-item">
      {slug ? <Link href={`/catalog/${slug}`}>{title}</Link> : title} <span className="call-number">{id}</span>
    </span>
  );
}

// ---------- The card and What's next ----------

function NotJoined({ email }: { email: string }) {
  const joinUrl = joinFormUrl(email);
  return (
    <div className="account-card stamp-card">
      <span className="stamp-label">Signed in as {email}</span>
      <h1 className="member-title">Join the library</h1>
      <p className="member-copy">
        You haven&rsquo;t joined yet. It&rsquo;s one form: your details, and the borrowing rules. I look
        over every sign-up myself and email you once I have.
      </p>
      <div className="account-card-foot">
        {joinUrl ? (
          <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Join the library
          </a>
        ) : (
          <span />
        )}
        <SignOutButton />
      </div>
      <p className="member-hint">Already joined with a different email? Sign out and sign in with that one.</p>
    </div>
  );
}

function HeaderCard({ member }: { member: Member }) {
  const status = STATUS_COPY[member.status];
  return (
    <header className="account-card stamp-card">
      <Painting slot="account" className="account-card-painting" priority sizes="(max-width: 900px) 100vw, 820px" />
      <div className="account-card-top">
        <span className="stamp-label">Borrower&rsquo;s card</span>
        {member.card_no !== null && <span className="account-card-no">{formatCardNo(member.card_no)}</span>}
      </div>
      <h1 className="member-title">{member.name}</h1>
      <div className="account-card-foot">
        <p className="account-card-facts">
          <span className={`status-stamp${status.muted ? ' status-stamp--muted' : ''}`}>{status.stamp}</span>
          <span>
            {member.approved_at
              ? `Member since ${formatMonth(member.approved_at)}`
              : `Joined ${formatDate(member.joined_at)}`}
          </span>
        </p>
        <SignOutButton />
      </div>
    </header>
  );
}

/**
 * One line on what happens next, and at most one button. With more than
 * one thing to say, the most urgent, plus "+1 more" to the Books tab:
 * overdue books, then books set aside, then due dates.
 */
function WhatsNext({ member, records }: { member: Member; records: AccountRecords }) {
  const items: ReactNode[] = [];
  let action: ReactNode = null;

  switch (member.status) {
    case 'pending':
      items.push(<>I&rsquo;m looking over your sign-up. You&rsquo;ll get an email.</>);
      break;
    case 'declined':
      items.push(member.decline_note ? <>&ldquo;{member.decline_note}&rdquo;</> : STATUS_COPY.declined.line);
      break;
    case 'left':
      items.push(STATUS_COPY.left.line);
      break;
    case 'approved': {
      const owed = owedPayments(records.payments);
      if (owed.length === 0) {
        items.push(<>Your payments are in. You can borrow once I&rsquo;ve checked them.</>);
      } else {
        const total = owed.reduce((sum, row) => sum + row.amount, 0);
        const parts = owed.map((row) => `₹${row.amount} ${row.short}`).join(' + ');
        items.push(
          <>
            Pay ₹{total} ({parts}) to start borrowing.
          </>,
        );
        if (UPI_ID) action = <CopyText text={UPI_ID} label="Copy UPI ID" />;
      }
      break;
    }
    case 'active':
    case 'paused': {
      const late = records.loansOut.filter((loan) => isOverdue(loan.due_at));
      for (const loan of late) {
        items.push(
          <>
            <em>{loan.book_title}</em> was due {formatDay(loan.due_at)}. Return it to borrow again.
          </>,
        );
      }
      for (const request of records.requests.filter((r) => r.status === 'accepted')) {
        items.push(
          <>
            <em>{request.book_title}</em> is set aside for you
            {request.set_aside_until ? ` until ${formatDay(request.set_aside_until)}` : ''}. I&rsquo;ll be in
            touch about the handover.
          </>,
        );
      }
      for (const loan of records.loansOut.filter((l) => !isOverdue(l.due_at))) {
        items.push(
          <>
            <em>{loan.book_title}</em> is due back {formatDay(loan.due_at)}.
          </>,
        );
      }
      if (items.length === 0 && member.status === 'paused') items.push(STATUS_COPY.paused.line);
      if (items.length === 0) {
        const waiting = records.requests.filter((r) => r.status === 'requested');
        const room = Math.max(member.borrow_limit - records.requests.length - records.loansOut.length, 0);
        if (room === 0 && waiting.length > 0) {
          items.push(
            <>
              You&rsquo;ve asked for <em>{waiting[0].book_title}</em>. I&rsquo;ll get back to you.
            </>,
          );
        } else {
          items.push(
            <>
              You can borrow {books(room)}
              {waiting.length > 0 ? ' more' : ''}.
            </>,
          );
          action = (
            <Link href="/catalog" className="btn btn-primary">
              Browse the catalog
            </Link>
          );
        }
      }
      break;
    }
  }

  const more = items.length - 1;
  return (
    <section className="account-next" aria-labelledby="account-next">
      <div className="account-next-text">
        <h2 id="account-next" className="account-heading">
          What&rsquo;s next
        </h2>
        <p className="account-next-line">{items[0]}</p>
        {more > 0 && (
          <Link href="/account?tab=books" className="account-next-more" scroll={false}>
            +{more} more
          </Link>
        )}
      </div>
      {action}
    </section>
  );
}

// ---------- Books ----------

function BooksTab({
  member,
  records,
  catalog,
  allHistory,
}: {
  member: Member;
  records: AccountRecords;
  catalog: Map<string, CatalogEntry>;
  allHistory: boolean;
}) {
  const borrowing = member.status === 'active' || member.status === 'paused';
  return (
    <>
      <section className="account-section" aria-labelledby="account-out">
        <h2 id="account-out" className="account-heading">
          Books out
        </h2>
        {records.loansOut.length === 0 ? (
          <p className="account-empty">
            {borrowing ? (
              <>
                Nothing out right now. Find something in the <Link href="/catalog">catalog</Link>.
              </>
            ) : (
              'Nothing out. Once your membership is active, ask for books from their pages in the catalog.'
            )}
          </p>
        ) : (
          <ul className="due-slips">
            {records.loansOut.map((loan) => (
              <DueSlip key={loan.id} loan={loan} catalog={catalog} />
            ))}
          </ul>
        )}
      </section>
      {(records.requests.length > 0 || records.endedRequests.length > 0) && (
        <Requests open={records.requests} ended={records.endedRequests} catalog={catalog} />
      )}
      {records.history.length > 0 && (
        <History loans={records.history} stats={records.stats} catalog={catalog} all={allHistory} />
      )}
    </>
  );
}

/** A date-due slip: the cover, the call number, and the due date stamped (red once it's late). */
function DueSlip({ loan, catalog }: { loan: Loan; catalog: Map<string, CatalogEntry> }) {
  const late = isOverdue(loan.due_at);
  const entry = catalog.get(loan.book_id);
  return (
    <li className="due-slip stamp-card">
      <div className="due-slip-cover">
        {entry?.coverUrl ? (
          <Image src={entry.coverUrl} alt="" fill sizes="96px" />
        ) : (
          <ClothPlate title={loan.book_title} bookId={loan.book_id} />
        )}
      </div>
      <div className="due-slip-body">
        <span className="call-number">{loan.book_id}</span>
        <h3 className="due-slip-title">
          {entry?.slug ? <Link href={`/catalog/${entry.slug}`}>{loan.book_title}</Link> : loan.book_title}
        </h3>
        <span className="stamp-label">{late ? 'Overdue · was due' : 'Date due'}</span>
        <span className={`stamp-date due-slip-date${late ? ' is-late' : ''}`}>{formatDay(loan.due_at)}</span>
        {loan.extended_count > 0 && (
          <p className="account-meta">
            Extended {loan.extended_count === 1 ? 'once' : `${loan.extended_count} times`}
          </p>
        )}
        <AskMoreTime
          loanId={loan.id}
          asks={loan.asks}
          maxAsks={MAX_MORE_TIME_ASKS}
          lastAsk={
            loan.last_ask
              ? {
                  extra: loan.last_ask.extra,
                  status: loan.last_ask.status,
                  note: loan.last_ask.librarian_note,
                  on: formatDay(loan.last_ask.created_at),
                }
              : null
          }
        />
      </div>
    </li>
  );
}

const ENDED_LABEL: Record<EndedRequest['status'], string> = {
  cancelled: 'Cancelled',
  declined: 'Declined',
  released: 'Not collected, released',
};

function Requests({
  open,
  ended,
  catalog,
}: {
  open: OpenRequest[];
  ended: EndedRequest[];
  catalog: Map<string, CatalogEntry>;
}) {
  return (
    <section className="account-section" aria-labelledby="account-requests">
      <h2 id="account-requests" className="account-heading">
        Requests
      </h2>
      <ul className="account-list">
        {open.map((request) => (
          <li key={request.id}>
            <BookName id={request.book_id} title={request.book_title} catalog={catalog} />
            <span className="account-meta">
              {request.status === 'accepted'
                ? `Set aside for you${request.set_aside_until ? ` until ${formatDay(request.set_aside_until)}` : ''}`
                : `Requested ${formatDay(request.created_at)} · ${request.handover === 'courier' ? 'by courier' : 'in person'}`}
            </span>
            {request.status === 'requested' && <CancelRequest requestId={request.id} title={request.book_title} />}
          </li>
        ))}
        {ended.map((request) => (
          <li key={request.id} className="account-ended">
            <BookName id={request.book_id} title={request.book_title} catalog={catalog} />
            <span className="account-meta">
              {ENDED_LABEL[request.status]} {formatDay(request.decided_at)}
            </span>
            {request.status === 'declined' && request.note && (
              <span className="account-reason">&ldquo;{request.note}&rdquo;</span>
            )}
          </li>
        ))}
      </ul>
      {ended.length > 0 && <p className="account-fine-print">Ended requests drop off after 3 months.</p>}
    </section>
  );
}

const HISTORY_SHOWN = 10;

function History({
  loans,
  stats,
  catalog,
  all,
}: {
  loans: Loan[];
  stats: AccountRecords['stats'];
  catalog: Map<string, CatalogEntry>;
  all: boolean;
}) {
  const years: [number, Loan[]][] = [];
  if (all) {
    for (const loan of loans) {
      const year = yearOf(loan.returned_at!);
      const last = years[years.length - 1];
      if (last && last[0] === year) last[1].push(loan);
      else years.push([year, [loan]]);
    }
  }

  return (
    <section className="account-section" aria-labelledby="account-history" id="history">
      <h2 id="account-history" className="account-heading">
        History
      </h2>
      {stats.since && (
        <p className="account-stats">
          {books(stats.borrowed)} borrowed since {formatMonth(stats.since)}
        </p>
      )}
      {all ? (
        years.map(([year, list]) => (
          <div key={year}>
            <h3 className="account-year">
              {year} <span className="account-year-count">{books(list.length)}</span>
            </h3>
            <HistoryList loans={list} catalog={catalog} />
          </div>
        ))
      ) : (
        <HistoryList loans={loans.slice(0, HISTORY_SHOWN)} catalog={catalog} />
      )}
      {loans.length > HISTORY_SHOWN &&
        (all ? (
          <Link href="/account?tab=books#history" className="account-more-link" scroll={false}>
            Show the latest {HISTORY_SHOWN}
          </Link>
        ) : (
          <Link href="/account?tab=books&history=all#history" className="account-more-link" scroll={false}>
            Show all {loans.length}, by year
          </Link>
        ))}
    </section>
  );
}

function HistoryList({ loans, catalog }: { loans: Loan[]; catalog: Map<string, CatalogEntry> }) {
  return (
    <ul className="account-list">
      {loans.map((loan) => (
        <li key={loan.id}>
          <BookName id={loan.book_id} title={loan.book_title} catalog={catalog} />
          <span className="account-meta">
            {formatDate(loan.lent_at)} – {formatDate(loan.returned_at!)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------- Waitlist ----------

function WaitlistTab({
  places,
  limit,
  catalog,
}: {
  places: WaitlistPlace[];
  limit: number;
  catalog: Map<string, CatalogEntry>;
}) {
  return (
    <section className="account-section" aria-labelledby="account-waitlist">
      <h2 id="account-waitlist" className="account-heading">
        Waitlist
      </h2>
      {places.length === 0 ? (
        <p className="account-empty">
          You&rsquo;re not waiting for any book. When one you want is out, &ldquo;Join the waitlist&rdquo; on
          its page.
        </p>
      ) : (
        <ul className="account-list">
          {places.map((w) => (
            <li key={w.book_id}>
              <BookName id={w.book_id} title={w.book_title} catalog={catalog} />
              <span className="account-meta">
                {w.place === 1 ? 'You’re first in line' : `You’re ${ordinal(w.place)} in line`}
              </span>
              <LeaveWaitlist bookId={w.book_id} title={w.book_title} />
            </li>
          ))}
        </ul>
      )}
      <p className="account-fine-print">
        Up to {MAX_WAITLISTS} at once, on top of your {books(limit)}. When it&rsquo;s your turn, I&rsquo;ll set
        the book aside and let you know.
      </p>
    </section>
  );
}

// ---------- Payments ----------

const PAYMENT_ROWS: { kind: PaymentKind; label: string; short: string; amount: number }[] = [
  { kind: 'deposit', label: 'Deposit (refundable)', short: 'deposit', amount: DEPOSIT_AMOUNT },
  { kind: 'subscription', label: 'Lifetime membership', short: 'membership', amount: SUBSCRIPTION_AMOUNT },
];

/** What's still to pay: kinds with no payment, or only a refunded one. */
function owedPayments(payments: Payment[]) {
  const byKind = new Map(payments.map((p) => [p.kind, p]));
  return PAYMENT_ROWS.filter(({ kind }) => {
    const payment = byKind.get(kind);
    return !payment || payment.status === 'refunded';
  });
}

const METHOD_LABEL: Record<NonNullable<Payment['method']>, string> = {
  upi: 'UPI',
  cash: 'Cash',
  other: 'Other',
};

function paymentState(payment: Payment | undefined): string {
  if (!payment) return 'Not marked yet';
  if (payment.status === 'waived') return 'Waived';
  if (payment.status === 'refunded') {
    const refunded = `Refunded ₹${payment.refund_amount ?? payment.amount}`;
    return payment.refunded_at ? `${refunded} · ${formatDate(payment.refunded_at)}` : refunded;
  }
  return ['Paid', payment.paid_at ? formatDate(payment.paid_at) : null, payment.method ? METHOD_LABEL[payment.method] : null]
    .filter(Boolean)
    .join(' · ');
}

function Payments({ payments, awaitingPayment }: { payments: Payment[]; awaitingPayment: boolean }) {
  // One row per kind (see getAccountRecords): the current one, or the
  // latest refund. A refunded deposit is owed again.
  const byKind = new Map(payments.map((p) => [p.kind, p]));
  const somethingOwed = owedPayments(payments).length > 0;

  return (
    <section className="account-section" aria-labelledby="account-payments">
      <h2 id="account-payments" className="account-heading">
        Payments
      </h2>
      <ul className="account-list">
        {PAYMENT_ROWS.map(({ kind, label, amount }) => {
          const payment = byKind.get(kind);
          return (
            <li key={kind}>
              <span className="account-item">
                {label}, ₹{payment?.amount ?? amount}
              </span>
              <span className="account-meta">{paymentState(payment)}</span>
            </li>
          );
        })}
      </ul>
      {awaitingPayment && somethingOwed && UPI_ID && (
        <div className="account-upi-box">
          <p className="account-note">
            Pay by UPI to <strong className="account-upi">{UPI_ID}</strong>. I&rsquo;ll mark it here once it
            arrives.
          </p>
          <CopyText text={UPI_ID} label="Copy UPI ID" />
        </div>
      )}
    </section>
  );
}

// ---------- Details ----------

function DetailsTab({ member, records, canRequest }: { member: Member; records: AccountRecords; canRequest: boolean }) {
  return (
    <>
      <section className="account-section" aria-labelledby="account-details">
        <h2 id="account-details" className="account-heading">
          Your details
        </h2>
        <DetailsCard
          email={member.email}
          current={{
            name: member.name,
            phone: member.phone,
            location: member.location,
            instagram: member.instagram,
            college: member.college,
            linkedin: member.linkedin,
          }}
          change={records.change}
          requestedOn={records.change ? formatDay(records.change.created_at) : null}
          decidedOn={records.change?.decided_at ? formatDay(records.change.decided_at) : null}
          closed={records.changesClosed}
          canRequest={canRequest}
        />
      </section>
      <section className="account-section account-leave" aria-label="Delete my account">
        <DeleteAccount booksOut={records.loansOut.length} />
      </section>
    </>
  );
}
