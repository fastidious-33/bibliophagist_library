import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOutNow, librarian } from '@/lib/desk';
import { addMonths, daysLate, isOverdue, MAX_LOAN_MONTHS, type LoanOut } from '@/lib/desk-loans';
import type { SetAside } from '@/lib/desk-requests';
import { extend, extendSetAsideAction, markReturned, releaseSetAsideAction } from '../actions';
import DeskForm from '../DeskForm';
import DeskHeader from '../DeskHeader';
import ExtendChoices from '../ExtendChoices';
import { day } from '../inbox/format';
import InboxButton from '../inbox/InboxButton';

export const metadata: Metadata = {
  title: 'Out now · The desk',
  robots: { index: false, follow: false },
};

// Other people's details: never cached.
export const dynamic = 'force-dynamic';

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** A YYYY-MM-DD date in India from a stored timestamp. */
function indiaDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

/**
 * Out now (PLAN.md "Account and desk rework", B4): two dense tables. Books
 * set aside and waiting for pickup; then books out, soonest due first,
 * with Return and Extend on every row and an Overdue filter. On a phone
 * each row stacks into a small block.
 */
export default async function OutNowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await librarian())) notFound();

  const params = await searchParams;
  const onlyOverdue = first(params.overdue) === '1';
  const { setAsides, loansOut } = await getOutNow();
  const overdueCount = loansOut.filter((loan) => isOverdue(loan.due_at)).length;
  const loans = onlyOverdue ? loansOut.filter((loan) => isOverdue(loan.due_at)) : loansOut;

  return (
    <section className="section section--flush desk">
      <DeskHeader title="Out now" aside={`${loansOut.length} out · ${setAsides.length} set aside`} />

      <section className="desk-queue" aria-labelledby="out-set-aside">
        <h2 id="out-set-aside" className="subhead">
          Set aside, waiting for pickup
        </h2>
        {setAsides.length === 0 ? (
          <p className="desk-empty">Nothing is set aside. Accepting a request sets its book aside for 14 days.</p>
        ) : (
          <table className="desk-table desk-stack">
            <thead>
              <tr>
                <th scope="col">Book</th>
                <th scope="col">For</th>
                <th scope="col">Until</th>
                <th scope="col">Handover</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {setAsides.map((request) => (
                <SetAsideRow key={request.id} request={request} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="desk-queue" aria-labelledby="out-loans">
        <div className="desk-queue-head">
          <h2 id="out-loans" className="subhead">
            Out
          </h2>
          <nav className="inbox-chips-row desk-filter" aria-label="Show">
            <Link href="/desk/out" className="inbox-filter" aria-current={onlyOverdue ? undefined : 'page'}>
              All <span className="inbox-filter-count">{loansOut.length}</span>
            </Link>
            {overdueCount > 0 && (
              <Link
                href="/desk/out?overdue=1"
                className="inbox-filter is-urgent"
                aria-current={onlyOverdue ? 'page' : undefined}
              >
                Overdue <span className="inbox-filter-count">{overdueCount}</span>
              </Link>
            )}
          </nav>
        </div>
        {loans.length === 0 ? (
          <p className="desk-empty">
            {onlyOverdue ? 'Nothing is overdue.' : 'No books are out.'}{' '}
            <Link href="/desk/lend">Lend a book</Link>.
          </p>
        ) : (
          <table className="desk-table desk-stack">
            <thead>
              <tr>
                <th scope="col">Book</th>
                <th scope="col">With</th>
                <th scope="col">Lent</th>
                <th scope="col">Due</th>
                <th scope="col">Handover</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <LoanRow key={loan.id} loan={loan} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

function Handover({ handover, address }: { handover: 'in_person' | 'courier'; address: string | null }) {
  return <>{handover === 'courier' ? `Courier: ${address ?? 'no address given'}` : 'In person'}</>;
}

function MemberLink({ id, name }: { id: string | null; name: string }) {
  return id ? (
    <Link href={`/desk/members/${id}`} prefetch={false}>
      {name}
    </Link>
  ) : (
    <>{name}</>
  );
}

/** A book set aside for someone: until when (red once the window has ended); Lend it, +7 days, Release. */
function SetAsideRow({ request }: { request: SetAside }) {
  const ended = request.set_aside_until ? isOverdue(request.set_aside_until) : false;
  const fields: [string, string][] = [['requestId', request.id]];
  return (
    <tr className={ended ? 'is-late' : undefined}>
      <td data-label="Book">
        <span className="desk-table-book">{request.book_title}</span> <span className="call-number">{request.book_id}</span>
      </td>
      <td data-label="For">
        <MemberLink id={request.member_id} name={request.member_name} />
        {request.member_note && <span className="desk-table-note">&ldquo;{request.member_note}&rdquo;</span>}
      </td>
      <td data-label="Until" className={`desk-num${ended ? ' desk-late' : ''}`}>
        {request.set_aside_until ? `${ended ? 'Ended ' : ''}${day(request.set_aside_until)}` : '—'}
      </td>
      <td data-label="Handover">
        <Handover handover={request.handover} address={request.courier_address} />
      </td>
      <td className="desk-table-actions-cell">
        <div className="desk-table-actions">
          <Link href={`/desk/lend?request=${request.id}`} className="btn btn-primary">
            Lend it
          </Link>
          <InboxButton action={extendSetAsideAction} fields={fields} label="+7 days" busy="…" stamp="Extended" variant="secondary" />
          <InboxButton
            action={releaseSetAsideAction}
            fields={fields}
            label="Release"
            busy="…"
            stamp="Released"
            variant="secondary"
            confirm={`Release “${request.book_title}”? It goes back on the shelf.`}
          />
        </div>
      </td>
    </tr>
  );
}

/** A book out: Return, Extend by a preset, or a custom date tucked away. */
function LoanRow({ loan }: { loan: LoanOut }) {
  const late = isOverdue(loan.due_at);
  const dueOn = indiaDate(loan.due_at);
  return (
    <tr className={late ? 'is-late' : undefined}>
      <td data-label="Book">
        <span className="desk-table-book">{loan.book_title}</span> <span className="call-number">{loan.book_id}</span>
      </td>
      <td data-label="With">
        <MemberLink id={loan.member_id} name={loan.member_name} />
      </td>
      <td data-label="Lent" className="desk-num">
        {day(loan.lent_at)}
      </td>
      <td data-label="Due" className={`desk-num${late ? ' desk-late' : ''}`}>
        {day(loan.due_at)}
        {late && ` · ${daysLate(loan.due_at)}d late`}
        {loan.extended_count > 0 && <span className="desk-table-note">extended {loan.extended_count}×</span>}
      </td>
      <td data-label="Handover">
        <Handover handover={loan.handover} address={loan.courier_address} />
        {loan.note && <span className="desk-table-note">{loan.note}</span>}
      </td>
      <td className="desk-table-actions-cell">
        <div className="desk-table-actions">
        <InboxButton
          action={markReturned}
          fields={[['loanId', loan.id]]}
          label="Return"
          busy="…"
          stamp="Returned"
          confirm={`Mark “${loan.book_title}” returned?`}
        />
        <ExtendChoices loan={loan} compact />
        <details className="desk-table-more">
          <summary className="text-button">Date…</summary>
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
        </div>
      </td>
    </tr>
  );
}
