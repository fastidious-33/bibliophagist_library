import Link from 'next/link';
import type { ReactNode } from 'react';
import { DEPOSIT_AMOUNT, SUBSCRIPTION_AMOUNT, UPI_ID } from '@/lib/account';
import { callUrl, emailUrl, MESSAGES, whatsappUrl } from '@/lib/contact';
import type {
  ChangeItem,
  InboxItem,
  InboxKind,
  InboxPerson,
  MoreTimeItem,
  OverdueItem,
  PaymentItem,
  RequestsItem,
  SetAsideItem,
  SignUpItem,
  TurnItem,
} from '@/lib/desk-inbox';
import { addDays, addMonths, daysLate, MAX_LOAN_MONTHS, todayInIndia } from '@/lib/desk-loans';
import { SET_ASIDE_DAYS } from '@/lib/desk-requests';
import { MAX_MORE_TIME_ASKS } from '@/lib/more-time';
import { LIFE_STAGE_LABEL, STATUS_COPY, type ChangeableField } from '@/lib/members';
import {
  approveDetailsChange,
  approveMoreTimeAction,
  approveSignUpsAction,
  acceptRequestsAction,
  declineDetailsChange,
  declineMoreTimeAction,
  declineRequestsAction,
  declineSignUpsAction,
  extend,
  extendSetAsideAction,
  markPaidAction,
  markReturned,
  releaseSetAsideAction,
  setAsideFromLineAction,
} from '../actions';
import DeskForm from '../DeskForm';
import ExtendChoices from '../ExtendChoices';
import DeclinePanel from './DeclinePanel';
import { day } from './format';
import InboxButton from './InboxButton';

/** What each kind is called, on its row and its card. */
export const KIND_LABEL: Record<InboxKind, string> = {
  signup: 'Sign-up',
  payment: 'Payment due',
  requests: 'Request',
  set_aside: 'Set aside',
  overdue: 'Overdue',
  change: 'Details change',
  more_time: 'More time',
  turn: 'First in line',
};

/**
 * The open inbox item, as an index card (PLAN.md "Account and desk
 * rework", B3c): paper, the call number in the corner, small-capital
 * labels, how to reach them, and the actions for that kind of item.
 */
export default function InboxCard({ item }: { item: InboxItem }) {
  switch (item.kind) {
    case 'signup':
      return <SignUpCard item={item} />;
    case 'payment':
      return <PaymentCard item={item} />;
    case 'requests':
      return <RequestsCard item={item} />;
    case 'set_aside':
      return <SetAsideCard item={item} />;
    case 'overdue':
      return <OverdueCard item={item} />;
    case 'change':
      return <ChangeCard item={item} />;
    case 'more_time':
      return <MoreTimeCard item={item} />;
    case 'turn':
      return <TurnCard item={item} />;
  }
}

function Card({
  kind,
  corner,
  title,
  sub,
  contact,
  children,
  actions,
}: {
  kind: string;
  corner?: string;
  title: ReactNode;
  sub?: ReactNode;
  contact?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <article className="inbox-card" aria-labelledby="inbox-card-title">
      <header className="inbox-card-head">
        <span className="inbox-card-kind">{kind}</span>
        {corner && <span className="call-number inbox-card-corner">{corner}</span>}
      </header>
      <h2 id="inbox-card-title" className="inbox-card-title">
        {title}
      </h2>
      {sub && <p className="inbox-card-sub">{sub}</p>}
      {contact}
      {children}
      <div className="inbox-card-actions">{actions}</div>
    </article>
  );
}

/** WhatsApp (with a ready message, if there is one), Call, Email, and their file. */
function Contact({ person, message, subject }: { person: InboxPerson; message?: string; subject?: string }) {
  const whatsapp = whatsappUrl(person.phone, message);
  const call = callUrl(person.phone);
  const email = emailUrl(person.email, subject);
  return (
    <p className="inbox-contact">
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer">
          WhatsApp{message ? ' (message ready)' : ''}
        </a>
      )}
      {call && <a href={call}>Call</a>}
      {email && <a href={email}>Email</a>}
      {person.id && (
        <Link href={`/desk/members/${person.id}`} prefetch={false}>
          Their file
        </Link>
      )}
    </p>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (shown.length === 0) return null;
  return (
    <dl className="inbox-facts">
      {shown.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "NA" and the like mean "none" on the Join form. */
function isNone(value: string | null): boolean {
  return !value || /^(na|n\/a|none|-)$/i.test(value.trim());
}

/** A profile link, only ever to the site it names; otherwise the text. */
function profile(kind: 'instagram' | 'linkedin', value: string | null): ReactNode {
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

// ---------- Sign-ups ----------

function SignUpCard({ item }: { item: SignUpItem }) {
  const s = item.signUp;
  const fields: [string, string][] = [['memberId', s.id]];
  return (
    <Card
      kind={KIND_LABEL.signup}
      title={s.name}
      sub={`Signed up ${day(s.joined_at)}${s.source === 'desk' ? ' · added at the desk' : ' · through the Join form'}`}
      contact={<Contact person={item.person} />}
      actions={
        <>
          <InboxButton action={approveSignUpsAction} fields={fields} label="Approve" busy="Approving…" stamp="Approved" shortcut="a" />
          <DeclinePanel
            action={declineSignUpsAction}
            fields={fields}
            send="Decline sign-up"
            shortcut
            chips={['I couldn’t confirm your details.', 'The library is full for now. I’ll write when there’s room.']}
          />
        </>
      }
    >
      <Facts
        rows={[
          ['Email', s.email],
          ['Phone', s.phone],
          ['Location', s.location],
          ['Instagram', profile('instagram', s.instagram) ?? <span className="desk-muted">None given</span>],
          ['LinkedIn', profile('linkedin', s.linkedin)],
          ['Status in life', s.life_stage ? LIFE_STAGE_LABEL[s.life_stage] : null],
          ['College', s.college],
        ]}
      />
    </Card>
  );
}

// ---------- Payments ----------

const PAYMENT = {
  deposit: { amount: DEPOSIT_AMOUNT, name: 'deposit' },
  subscription: { amount: SUBSCRIPTION_AMOUNT, name: 'membership' },
} as const;

function PaymentCard({ item }: { item: PaymentItem }) {
  const total = item.owes.reduce((sum, kind) => sum + PAYMENT[kind].amount, 0);
  const parts = item.owes.map((kind) => `₹${PAYMENT[kind].amount} ${PAYMENT[kind].name}`).join(' + ');
  return (
    <Card
      kind={KIND_LABEL.payment}
      title={item.person.name}
      sub={`Approved ${day(item.since)} · owes ₹${total} (${parts})`}
      contact={<Contact person={item.person} message={MESSAGES.payment(item.person.name, total, parts, UPI_ID)} />}
      actions={
        <>
          {item.owes.map((kind) => (
            <InboxButton
              key={kind}
              action={markPaidAction}
              fields={[
                ['memberId', item.person.id!],
                ['kind', kind],
              ]}
              label={`Mark ₹${PAYMENT[kind].amount} ${PAYMENT[kind].name} paid`}
              busy="Marking…"
              stamp="Paid"
              advance={item.owes.length === 1}
            />
          ))}
        </>
      }
    >
      <p className="inbox-note">
        Marks it paid by UPI today. Cash, waived or another amount:{' '}
        <Link href={`/desk/members/${item.person.id}`} prefetch={false}>
          their file
        </Link>
        .
      </p>
    </Card>
  );
}

// ---------- Requests ----------

const REQUEST_REASONS = ['It’s already out. Join the waitlist on its page.', 'You’re at your limit for now.'];

function RequestsCard({ item }: { item: RequestsItem }) {
  const several = item.requests.length > 1;
  const allIds: [string, string][] = item.requests.map((r) => ['requestId', r.id]);
  return (
    <Card
      kind={several ? `${KIND_LABEL.requests} · ${item.requests.length} books` : KIND_LABEL.requests}
      title={item.person.name}
      sub={`Holding ${item.held} of their ${item.limit} (requests, set-asides and books out)`}
      contact={<Contact person={item.person} />}
      actions={
        several ? (
          <>
            <InboxButton
              action={acceptRequestsAction}
              fields={allIds}
              label={`Accept all ${item.requests.length}`}
              busy="Accepting…"
              stamp="Accepted"
              shortcut="a"
            />
            <DeclinePanel action={declineRequestsAction} fields={allIds} label="Decline all" send="Decline all" shortcut chips={REQUEST_REASONS} />
          </>
        ) : null
      }
    >
      <ul className="inbox-books">
        {item.requests.map((request) => {
          const fields: [string, string][] = [['requestId', request.id]];
          return (
            <li key={request.id} className="inbox-book">
              <div className="inbox-book-head">
                <span className="inbox-book-title">
                  {request.book_title} <span className="call-number">{request.book_id}</span>
                </span>
                <span className={`inbox-tag${request.available ? '' : ' is-out'}`}>
                  {request.available ? 'On the shelf' : 'Out'}
                </span>
              </div>
              <Facts
                rows={[
                  ['Asked', day(request.created_at)],
                  [
                    'Handover',
                    request.handover === 'courier'
                      ? `Courier: ${request.courier_address ?? 'no address given'}`
                      : 'In person',
                  ],
                  ['Their note', request.member_note],
                ]}
              />
              <div className="inbox-book-actions">
                <InboxButton
                  action={acceptRequestsAction}
                  fields={fields}
                  label="Accept"
                  busy="Accepting…"
                  stamp="Accepted"
                  advance={!several}
                  variant={several ? 'secondary' : 'primary'}
                  shortcut={several ? undefined : 'a'}
                />
                <DeclinePanel
                  action={declineRequestsAction}
                  fields={fields}
                  send="Decline request"
                  advance={!several}
                  shortcut={!several}
                  chips={REQUEST_REASONS}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------- Set aside ----------

function SetAsideCard({ item }: { item: SetAsideItem }) {
  const r = item.request;
  const fields: [string, string][] = [['requestId', r.id]];
  const release = (
    <InboxButton
      key="release"
      action={releaseSetAsideAction}
      fields={fields}
      label="Release"
      busy="Releasing…"
      stamp="Released"
      variant={item.stage === 'release' ? 'primary' : 'secondary'}
      confirm={`Release “${r.book_title}”? It goes back on the shelf.`}
    />
  );
  const lend = (
    <Link key="lend" href={`/desk/lend?request=${r.id}`} className={`btn ${item.stage === 'release' ? 'btn-secondary' : 'btn-primary'}`}>
      Lend it
    </Link>
  );
  const more = (
    <InboxButton key="more" action={extendSetAsideAction} fields={fields} label="+7 days" busy="Extending…" stamp="Extended" variant="secondary" />
  );
  return (
    <Card
      kind={item.stage === 'release' ? 'Not collected' : KIND_LABEL.set_aside}
      corner={r.book_id}
      title={r.book_title}
      sub={
        item.stage === 'release'
          ? `For ${item.person.name}. The pickup window ends ${day(r.set_aside_until)}. Release it?`
          : `For ${item.person.name}, until ${day(r.set_aside_until)}. A week on and not collected: nudge them?`
      }
      contact={<Contact person={item.person} message={MESSAGES.setAside(item.person.name, r.book_title, day(r.set_aside_until))} />}
      actions={item.stage === 'release' ? [release, more, lend] : [lend, more, release]}
    >
      <Facts
        rows={[
          ['Asked', day(r.created_at)],
          ['Handover', r.handover === 'courier' ? `Courier: ${r.courier_address ?? 'no address given'}` : 'In person'],
          ['Their note', r.member_note],
        ]}
      />
    </Card>
  );
}

// ---------- Overdue ----------

/** A YYYY-MM-DD date in India from a stored timestamp. */
function indiaDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

function OverdueCard({ item }: { item: OverdueItem }) {
  const loan = item.loan;
  const late = daysLate(loan.due_at);
  const dueOn = indiaDate(loan.due_at);
  return (
    <Card
      kind={KIND_LABEL.overdue}
      corner={loan.book_id}
      title={loan.book_title}
      sub={
        <>
          With {item.person.name} · <span className="desk-late">{late} {late === 1 ? 'day' : 'days'} late</span>, was due{' '}
          {day(loan.due_at)}
        </>
      }
      contact={<Contact person={item.person} message={MESSAGES.overdue(item.person.name, loan.book_title, day(loan.due_at))} />}
      actions={
        <>
          <InboxButton
            action={markReturned}
            fields={[['loanId', loan.id]]}
            label="Mark returned"
            busy="Saving…"
            stamp="Returned"
            confirm={`Mark “${loan.book_title}” returned?`}
          />
          <ExtendChoices loan={loan} shortcut />
          <details className="inbox-more">
            <summary className="text-button">Another date…</summary>
            <DeskForm action={extend} submit="Extend" busy="Extending…" className="desk-decline-form">
              <input type="hidden" name="loanId" value={loan.id} />
              <div className="desk-fields">
                <label>
                  <span>New due date</span>
                  <input name="dueOn" type="date" required defaultValue={addMonths(dueOn, 1)} min={dueOn} />
                </label>
                <label className="desk-check">
                  <input type="checkbox" name="allowLonger" />
                  <span>Allow more than {MAX_LOAN_MONTHS} months from lending</span>
                </label>
              </div>
            </DeskForm>
          </details>
        </>
      }
    >
      <Facts
        rows={[
          ['Lent', `${day(loan.lent_at)}${loan.extended_count > 0 ? ` · extended ${loan.extended_count}×` : ''}`],
          ['Handover', loan.handover === 'courier' ? `Courier: ${loan.courier_address ?? 'no address'}` : 'In person'],
          ['Your note', loan.note],
        ]}
      />
    </Card>
  );
}

// ---------- Details changes ----------

const CHANGE_LABELS: Record<ChangeableField, string> = {
  name: 'Name',
  phone: 'Phone',
  location: 'Location',
  instagram: 'Instagram',
  college: 'College',
  linkedin: 'LinkedIn',
};

function ChangeCard({ item }: { item: ChangeItem }) {
  const change = item.change;
  const fields = (Object.keys(CHANGE_LABELS) as ChangeableField[]).filter((key) => key in change.new_values);
  const ids: [string, string][] = [['changeId', change.id]];
  return (
    <Card
      kind={KIND_LABEL.change}
      title={item.person.name}
      sub={`Asked ${day(item.since)} to change ${fields.map((f) => CHANGE_LABELS[f].toLowerCase()).join(', ')}`}
      contact={<Contact person={item.person} />}
      actions={
        <>
          <InboxButton action={approveDetailsChange} fields={ids} label="Approve" busy="Approving…" stamp="Approved" shortcut="a" />
          <DeclinePanel
            action={declineDetailsChange}
            fields={ids}
            send="Decline change"
            shortcut
            chips={['Please send me proof of this first.', 'That doesn’t look right. Message me about it.']}
          />
        </>
      }
    >
      <table className="desk-table desk-change-table">
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Now</th>
            <th scope="col">Asked for</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((key) => (
            <tr key={key}>
              <th scope="row">{CHANGE_LABELS[key]}</th>
              <td>{change.current[key] ?? <span className="desk-muted">empty</span>}</td>
              <td>
                <strong>{change.new_values[key] ?? <em>remove</em>}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {change.member_note && <p className="inbox-quote">&ldquo;{change.member_note}&rdquo;</p>}
    </Card>
  );
}

// ---------- First in line (B4) ----------

/**
 * A waited-for book back on the shelf: set it aside for the first in line
 * who can borrow (paused people keep their place but are skipped), or for
 * anyone else in the line, or lend it to someone else entirely.
 */
function TurnCard({ item }: { item: TurnItem }) {
  const { line, suggested } = item;
  const until = day(addDays(todayInIndia(), SET_ASIDE_DAYS));
  const waiting = line.entries.length;
  return (
    <Card
      kind={KIND_LABEL.turn}
      corner={line.book_id}
      title={line.book_title}
      sub={
        suggested
          ? `Back on the shelf. ${suggested.name} is first in line${waiting > 1 ? ` (${waiting} waiting)` : ''}. Set it aside?`
          : 'Back on the shelf, but everyone waiting is paused.'
      }
      contact={
        suggested ? (
          <Contact person={item.person} message={MESSAGES.setAside(suggested.name, line.book_title, until)} />
        ) : undefined
      }
      actions={
        <>
          {suggested && (
            <InboxButton
              action={setAsideFromLineAction}
              fields={[['waitId', suggested.id]]}
              label={`Set aside for ${suggested.name.split(/\s+/)[0]}`}
              busy="Setting aside…"
              stamp="Set aside"
              shortcut="a"
            />
          )}
          <Link href={`/desk/lend?book=${encodeURIComponent(line.book_id)}`} className="btn btn-secondary">
            Lend it to someone else
          </Link>
          <Link href="/desk/waitlist" className="inbox-more-link">
            The waitlist
          </Link>
        </>
      }
    >
      <ol className="inbox-line">
        {line.entries.map((entry, index) => (
          <li key={entry.id}>
            <span className="inbox-line-place">{index + 1}</span>
            <span className="inbox-line-who">
              <Link href={`/desk/members/${entry.member_id}`} prefetch={false}>
                {entry.name}
              </Link>{' '}
              {entry.status !== 'active' && <span className="inbox-tag is-out">{STATUS_COPY[entry.status].stamp}</span>}
              <span className="desk-meta"> · since {day(entry.created_at)}</span>
            </span>
            {entry.id !== suggested?.id && entry.status === 'active' && (
              <InboxButton
                action={setAsideFromLineAction}
                fields={[['waitId', entry.id]]}
                label="Set aside"
                busy="Setting aside…"
                stamp="Set aside"
                variant="secondary"
              />
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------- More time ----------

function MoreTimeCard({ item }: { item: MoreTimeItem }) {
  const ids: [string, string][] = [['askId', item.ask.id]];
  return (
    <Card
      kind={KIND_LABEL.more_time}
      corner={item.loan.book_id}
      title={item.loan.book_title}
      sub={`${item.person.name} asks for ${item.ask.extra} more`}
      contact={<Contact person={item.person} />}
      actions={
        <>
          <InboxButton
            action={approveMoreTimeAction}
            fields={ids}
            label={`Approve: due ${day(item.ask.new_due_on)}`}
            busy="Approving…"
            stamp="Approved"
            shortcut="a"
          />
          <DeclinePanel
            action={declineMoreTimeAction}
            fields={ids}
            send="Decline"
            shortcut
            chips={['Someone’s waiting for this book.', 'It’s been out a while. Please bring it back.']}
          />
        </>
      }
    >
      <Facts
        rows={[
          ['Due now', day(item.loan.due_at)],
          ['If approved', day(item.ask.new_due_on)],
          ['Lent', `${day(item.loan.lent_at)}${item.loan.extended_count > 0 ? ` · extended ${item.loan.extended_count}×` : ''}`],
          ['Asks', `${item.ask.asks} of ${MAX_MORE_TIME_ASKS} on this book`],
        ]}
      />
      {item.ask.member_note && <p className="inbox-quote">&ldquo;{item.ask.member_note}&rdquo;</p>}
    </Card>
  );
}
