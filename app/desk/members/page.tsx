import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { librarian } from '@/lib/desk';
import { archiveEndsOn, LIST_FILTERS, listMembers, memberEmails, type ListFilter } from '@/lib/desk-members';
import { STATUS_COPY } from '@/lib/members';
import { addMember } from '../actions';
import DeskForm from '../DeskForm';
import DeskHeader from '../DeskHeader';
import EmailMembers from './EmailMembers';
import MemberFields from './MemberFields';

export const metadata: Metadata = {
  title: 'Members · The desk',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

const FILTER_LABEL: Record<ListFilter, string> = {
  '': 'Members',
  approved: STATUS_COPY.approved.stamp,
  active: STATUS_COPY.active.stamp,
  paused: STATUS_COPY.paused.stamp,
  pending: 'Pending sign-ups',
  declined: 'Declined (archive)',
};

/**
 * The members (M3 A2): approved, active and paused people by default;
 * one stage, pending sign-ups or the Declined archive by filter. Search
 * (name, email, phone or card number), add one by hand, and email them all.
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await librarian();
  if (!me) notFound();

  const params = await searchParams;
  const search = first(params.q).slice(0, 100);
  const status = first(params.status);
  const stage: ListFilter = (LIST_FILTERS as readonly string[]).includes(status) ? (status as ListFilter) : '';
  const archive = stage === 'declined';
  const [members, emails] = await Promise.all([listMembers(search, stage), memberEmails()]);
  const noun = archive
    ? 'in the archive'
    : stage === 'pending'
      ? members.length === 1
        ? 'sign-up'
        : 'sign-ups'
      : members.length === 1
        ? 'member'
        : 'members';

  return (
    <section className="section section--flush desk">
      <DeskHeader title="Members" aside={`${members.length} ${noun}${search ? ' found' : ''}`} />

      {first(params.removed) === 'done' && (
        <p className="desk-done" role="status">
          Removed, with their sign-in.
        </p>
      )}
      {first(params.removed) === 'login-kept' && (
        <p className="desk-warning" role="status">
          Removed, but their sign-in couldn&rsquo;t be deleted: make your own login an admin in Neon (Auth →
          Users → ⋯ → Make admin) for next time. Signing in, they&rsquo;d only see &ldquo;Join the
          library&rdquo;.
        </p>
      )}

      <EmailMembers to={me.email} emails={emails} />

      {archive && (
        <p className="desk-empty">
          Declined sign-ups stay here for 30 days, then are deleted automatically. Change someone&rsquo;s stage
          to take them out of the archive.
        </p>
      )}

      <form className="desk-search" role="search">
        <label>
          <span className="visually-hidden">Search by name, email, phone or card number</span>
          <input type="search" name="q" defaultValue={search} placeholder="Name, email, phone or card no." />
        </label>
        <label>
          <span className="visually-hidden">Stage</span>
          <select name="status" defaultValue={stage}>
            {LIST_FILTERS.map((s) => (
              <option key={s} value={s}>
                {FILTER_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </form>

      <details className="desk-add">
        <summary className="btn btn-primary">Add a member</summary>
        <p className="desk-empty">
          For people who&rsquo;ll never use the Join form, or who already have a book. If they sign in later
          with the same email, this record becomes theirs.
        </p>
        <DeskForm action={addMember} submit="Add member" busy="Adding…" className="desk-form">
          <MemberFields />
        </DeskForm>
      </details>

      {members.length === 0 ? (
        <p className="desk-empty">
          {search
            ? 'No one matches.'
            : archive
              ? 'The archive is empty.'
              : stage
                ? 'No one at this stage.'
                : 'No members yet.'}
        </p>
      ) : (
        <div className="desk-table-wrap">
          <table className="desk-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Card</th>
                <th scope="col">Stage</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Books out</th>
                <th scope="col">{archive ? 'Deleted on' : 'Joined'}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/desk/members/${m.id}`} prefetch={false}>
                      {m.name}
                    </Link>
                  </td>
                  <td className="desk-num">{m.card_no !== null ? String(m.card_no).padStart(4, '0') : '—'}</td>
                  <td>{STATUS_COPY[m.status].stamp}</td>
                  <td>{m.email}</td>
                  <td>{m.phone}</td>
                  <td className="desk-num">{m.books_out}</td>
                  <td>
                    {archive && m.declined_at
                      ? dateFormat.format(archiveEndsOn(m.declined_at))
                      : dateFormat.format(new Date(m.joined_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
