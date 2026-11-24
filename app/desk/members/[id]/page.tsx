import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { DEPOSIT_AMOUNT, SUBSCRIPTION_AMOUNT } from '@/lib/account';
import { librarian } from '@/lib/desk';
import { isOverdue } from '@/lib/desk-loans';
import {
  archiveEndsOn,
  getMemberFile,
  MEMBER_STATUSES,
  type DeskLoan,
  type DeskPayment,
} from '@/lib/desk-members';
import { formatCardNo, LIFE_STAGE_LABEL, STATUS_COPY } from '@/lib/members';
import { ordinal } from '@/app/account/format';
import {
  addPayment,
  allowChangeRequests,
  refund,
  removeMember,
  removePayment,
  saveLimitAction,
  saveMember,
} from '../../actions';
import DeskForm from '../../DeskForm';
import EditableDetails from '../EditableDetails';
import MemberFields from '../MemberFields';

export const metadata: Metadata = {
  title: 'Member · The desk',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function formatDate(value: string | Date): string {
  return dateFormat.format(new Date(value));
}

/** Today in India, as a date field's value (YYYY-MM-DD). */
function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** "NA" and the like mean "none" on the Join form. */
function isNone(value: string | null): boolean {
  return !value || /^(na|n\/a|none|-)$/i.test(value.trim());
}

/** A profile as a link, only ever to the site it names; otherwise the text. */
function profileLink(kind: 'instagram' | 'linkedin', value: string | null): ReactNode {
  if (isNone(value)) return null;
  const text = value!.trim();
  let href: string | null = null;
  if (/^https?:\/\//i.test(text)) href = text;
  else if (kind === 'instagram' && /^@?[\w.]{1,30}$/.test(text)) href = `https://www.instagram.com/${text.replace(/^@/, '')}/`;
  else if (kind === 'linkedin' && /^(www\.)?linkedin\.com\//i.test(text)) href = `https://${text}`;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  ) : (
    text
  );
}

/** A book's title and call number, opening the desk's search for it (where it is now). */
function BookTitle({ id, title }: { id: string; title: string }) {
  return (
    <Link href={`/desk/search?q=${encodeURIComponent(id)}`} prefetch={false}>
      {title} <span className="call-number">{id}</span>
    </Link>
  );
}

/** One group of a member's books (Requested, Out, In line, History), with a small heading. */
function BookGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="member-book-group">
      <h3 className="member-book-group-title">{title}</h3>
      <ul className="desk-list">{children}</ul>
    </div>
  );
}

const KIND_LABEL = { deposit: 'Deposit', subscription: 'Lifetime membership' } as const;
const METHOD_LABEL = { upi: 'UPI', cash: 'Cash', other: 'Other' } as const;

/** History rows shown before "Show all". */
const HISTORY_SHOWN = 5;

/**
 * One member's file (M3 A2; laid out again in B4): their details first, as
 * rows ("Edit details" turns them into the form), then Payments beside
 * Books (requested, out, in line, history), then removing them. Each
 * book's title opens the desk's search for it: where it is right now.
 */
export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await librarian())) notFound();

  const { id } = await params;
  const allHistory = (await searchParams).history === 'all';
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const file = await getMemberFile(id);
  if (!file) notFound();

  const { member, payments, loans, requests, waiting, changesClosed } = file;
  const status = STATUS_COPY[member.status];
  const out = loans.filter((loan) => !loan.returned_at);
  const returned = loans.filter((loan) => loan.returned_at);
  const today = todayInIndia();
  // Payments only for members: not pending or declined people.
  const canPay = MEMBER_STATUSES.includes(member.status);

  return (
    <section className="section section--flush desk">
      <nav className="desk-nav" aria-label="Where you are">
        <Link href="/desk/members">Members</Link>
        <span aria-current="page">{member.name}</span>
      </nav>
      <div className="section-heading">
        <h1>{member.name}</h1>
        <span className={`status-stamp${status.muted ? ' status-stamp--muted' : ''}`}>{status.stamp}</span>
      </div>
      <p className="desk-facts">
        {member.card_no !== null && <>{formatCardNo(member.card_no)} · </>}
        {member.source === 'tally' ? 'Joined through the Join form' : 'Added at the desk'} on{' '}
        {formatDate(member.joined_at)}
        {member.approved_at && <> · approved {formatDate(member.approved_at)}</>}
        {member.consent_at && <> · consented {formatDate(member.consent_at)}</>}
        {' · '}
        {member.login_id ? 'has signed in' : 'hasn’t signed in yet'}
      </p>
      {member.status === 'declined' && member.declined_at && (
        <p className="desk-warning" role="note">
          Declined {formatDate(member.declined_at)}: in the archive, and deleted automatically on{' '}
          {formatDate(archiveEndsOn(member.declined_at))}. Change their stage to keep them.
        </p>
      )}
      <section className="desk-queue member-details" aria-labelledby="member-details">
        <h2 id="member-details" className="subhead">
          Details
        </h2>
        <EditableDetails
          action={saveMember}
          view={
            <dl className="inbox-facts member-facts">
              {(
                [
                  ['Name', member.name],
                  ['Email', <a key="email" href={`mailto:${member.email}`}>{member.email}</a>],
                  ['Phone', member.phone],
                  ['Stage', status.stamp],
                  ['Location', member.location],
                  ['Instagram', profileLink('instagram', member.instagram)],
                  ['LinkedIn', profileLink('linkedin', member.linkedin)],
                  ['College', member.college],
                  ['Status in life', member.life_stage ? LIFE_STAGE_LABEL[member.life_stage] : null],
                  ['Your note', member.librarian_note],
                  ['Decline note', member.status === 'declined' ? member.decline_note : null],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || <span className="desk-muted">Not given</span>}</dd>
                </div>
              ))}
            </dl>
          }
        >
          <MemberFields member={member} />
        </EditableDetails>
      </section>

      <div className="desk-file">
        <section className="desk-queue" aria-labelledby="member-payments">
          <h2 id="member-payments" className="subhead">
            Payments
          </h2>
          {payments.length === 0 ? (
            <p className="desk-empty">Nothing marked yet.</p>
          ) : (
            <ul className="desk-list">
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} memberId={member.id} today={today} />
              ))}
            </ul>
          )}

          {!canPay ? (
            <p className="desk-empty">Payments open once they&rsquo;re approved.</p>
          ) : (
          <details className="desk-add">
            <summary className="btn btn-secondary">Mark a payment</summary>
            <DeskForm action={addPayment} submit="Mark payment" className="desk-form">
              <input type="hidden" name="memberId" value={member.id} />
              <div className="desk-fields">
                <label>
                  <span>For</span>
                  <select name="kind" defaultValue="deposit">
                    <option value="deposit">Deposit (₹{DEPOSIT_AMOUNT})</option>
                    <option value="subscription">Lifetime membership (₹{SUBSCRIPTION_AMOUNT})</option>
                  </select>
                </label>
                <label>
                  <span>Paid or waived</span>
                  <select name="status" defaultValue="paid">
                    <option value="paid">Paid</option>
                    <option value="waived">Waived</option>
                  </select>
                </label>
                <label>
                  <span>Amount, ₹ (blank for the usual)</span>
                  <input name="amount" type="number" min={0} max={100000} step={1} />
                </label>
                <label>
                  <span>How</span>
                  <select name="method" defaultValue="upi">
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  <span>Date paid</span>
                  <input name="paidOn" type="date" defaultValue={today} max={today} />
                </label>
                <label>
                  <span>UPI reference (optional)</span>
                  <input name="reference" maxLength={100} autoComplete="off" />
                </label>
                <label className="desk-field-wide">
                  <span>Note (optional)</span>
                  <input name="note" maxLength={500} autoComplete="off" />
                </label>
              </div>
            </DeskForm>
          </details>
          )}
        </section>

        <section className="desk-queue" aria-labelledby="member-books">
          <h2 id="member-books" className="subhead">
            Books
          </h2>
          {requests.length === 0 && loans.length === 0 && waiting.length === 0 && (
            <p className="desk-empty">No requests or loans yet.</p>
          )}

          {requests.length > 0 && (
            <BookGroup title="Requested">
              {requests.map((r) => (
                <li key={r.id}>
                  <BookTitle id={r.book_id} title={r.book_title} />
                  <span className="desk-meta">
                    {r.status === 'accepted' ? 'Set aside' : 'Waiting'} since {formatDate(r.created_at)}
                  </span>
                  <span className="desk-row-actions desk-wide">
                    {r.status === 'accepted' ? (
                      <Link href={`/desk/lend?request=${r.id}`} className="desk-link">
                        Lend it
                      </Link>
                    ) : (
                      <Link href={`/desk?type=requests&item=requests:${member.id}`} className="desk-link">
                        Accept or decline in the inbox
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </BookGroup>
          )}

          {out.length > 0 && (
            <BookGroup title="Out">
              {out.map((loan) => (
                <LoanRow key={loan.id} loan={loan} />
              ))}
            </BookGroup>
          )}

          {waiting.length > 0 && (
            <BookGroup title="In line">
              {waiting.map((w) => (
                <li key={`wait-${w.book_id}`}>
                  <BookTitle id={w.book_id} title={w.book_title} />
                  <span className="desk-meta">
                    {w.place === 1 ? 'First' : ordinal(w.place)} in line, since {formatDate(w.created_at)}
                  </span>
                </li>
              ))}
            </BookGroup>
          )}

          {returned.length > 0 && (
            <BookGroup title={`History · ${returned.length}`}>
              {(allHistory ? returned : returned.slice(0, HISTORY_SHOWN)).map((loan) => (
                <LoanRow key={loan.id} loan={loan} />
              ))}
              {returned.length > HISTORY_SHOWN && (
                <li className="desk-more-row">
                  <Link
                    href={allHistory ? `/desk/members/${member.id}` : `/desk/members/${member.id}?history=all`}
                    className="desk-link"
                    scroll={false}
                  >
                    {allHistory ? `Show the latest ${HISTORY_SHOWN}` : `Show all ${returned.length}`}
                  </Link>
                </li>
              )}
            </BookGroup>
          )}
          {canPay && (
            <DeskForm action={saveLimitAction} submit="Save limit" variant="secondary" className="desk-form desk-limit">
              <input type="hidden" name="memberId" value={member.id} />
              <label>
                <span>
                  Book limit (holding {requests.length + out.length} now; usually 2)
                </span>
                <input name="limit" type="number" min={1} max={10} step={1} defaultValue={member.borrow_limit} required />
              </label>
            </DeskForm>
          )}
          {member.status !== 'declined' && (
            <p className="desk-add">
              <Link href={`/desk/lend?member=${member.id}`} className="btn btn-secondary">
                Lend books to {member.name.split(/\s+/)[0]}
              </Link>
            </p>
          )}
        </section>
      </div>

      {changesClosed && (
        <section className="desk-queue" aria-labelledby="member-changes">
          <h2 id="member-changes" className="subhead">
            Change requests
          </h2>
          <p className="desk-empty">
            Closed: their last three requests were declined. They see &ldquo;Ask me if something needs
            updating.&rdquo;
          </p>
          <DeskForm action={allowChangeRequests} submit="Allow change requests again" variant="secondary">
            <input type="hidden" name="memberId" value={member.id} />
          </DeskForm>
        </section>
      )}

      <section className="desk-queue desk-danger" aria-labelledby="member-remove">
        <h2 id="member-remove" className="subhead">
          Remove member
        </h2>
        <p className="desk-empty">
          Deletes their details, payments and requests, and their sign-in, like &ldquo;Delete my
          account&rdquo;. Their loans stay with only their name. Only possible with no books out.
        </p>
        <DeskForm
          action={removeMember}
          submit={`Remove ${member.name}`}
          busy="Removing…"
          variant="secondary"
          confirm={`Remove ${member.name}? This can't be undone.`}
        >
          <input type="hidden" name="memberId" value={member.id} />
        </DeskForm>
      </section>
    </section>
  );
}

function paymentSummary(p: DeskPayment): string {
  if (p.status === 'waived') return 'Waived';
  const paid = [
    `Paid ₹${p.amount}`,
    p.paid_at ? formatDate(p.paid_at) : null,
    p.method ? METHOD_LABEL[p.method] : null,
    p.reference ? `ref ${p.reference}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  if (p.status === 'refunded') {
    const back = `refunded ₹${p.refund_amount ?? p.amount}${p.refunded_at ? ` on ${formatDate(p.refunded_at)}` : ''}`;
    return `${paid}; ${back}`;
  }
  return paid;
}

function PaymentRow({ payment, memberId, today }: { payment: DeskPayment; memberId: string; today: string }) {
  return (
    <li className="desk-payment">
      <span>
        {KIND_LABEL[payment.kind]}
        {payment.status === 'refunded' && <span className="desk-tag">refunded</span>}
      </span>
      <span className="desk-meta">{paymentSummary(payment)}</span>
      {payment.note && <span className="desk-meta desk-wide">{payment.note}</span>}
      <div className="desk-row-actions desk-wide">
        {payment.kind === 'deposit' && payment.status === 'paid' && (
          <details>
            <summary className="text-button">Refund…</summary>
            <DeskForm action={refund} submit="Mark refunded" className="desk-form desk-form--inline">
              <input type="hidden" name="memberId" value={memberId} />
              <input type="hidden" name="paymentId" value={payment.id} />
              <div className="desk-fields">
                <label>
                  <span>Amount refunded, ₹</span>
                  <input name="amount" type="number" min={0} max={payment.amount} step={1} defaultValue={payment.amount} required />
                </label>
                <label>
                  <span>Date refunded</span>
                  <input name="refundedOn" type="date" defaultValue={today} max={today} required />
                </label>
              </div>
            </DeskForm>
          </details>
        )}
        <DeskForm
          action={removePayment}
          submit="Remove entry"
          busy="Removing…"
          variant="text"
          confirm="Remove this payment entry? Only for a mistake: refunds should be marked as refunds."
        >
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="paymentId" value={payment.id} />
        </DeskForm>
      </div>
    </li>
  );
}

function LoanRow({ loan }: { loan: DeskLoan }) {
  const late = !loan.returned_at && isOverdue(loan.due_at);
  return (
    <li>
      <BookTitle id={loan.book_id} title={loan.book_title} />
      <span className={`desk-meta${late ? ' desk-late' : ''}`}>
        {loan.returned_at
          ? `${formatDate(loan.lent_at)} – ${formatDate(loan.returned_at)}`
          : `${late ? 'Overdue since' : 'Out, due'} ${formatDate(loan.due_at)}`}
        {loan.extended_count > 0 && ` · extended ${loan.extended_count}×`}
      </span>
    </li>
  );
}
