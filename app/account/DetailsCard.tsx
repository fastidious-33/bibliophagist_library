'use client';

import { useActionState, useState, useTransition, type ReactNode } from 'react';
import type { DetailsChange } from '@/lib/account';
import type { ChangeableField, DetailValues } from '@/lib/members';
import { requestChange, withdrawChange, type ChangeState } from './actions';

/** Same order and keys as CHANGEABLE_FIELDS in lib/members.ts (kept here so no server code reaches the browser). */
const FIELDS: { name: ChangeableField; label: string; type: string; autoComplete: string; max: number }[] = [
  { name: 'name', label: 'Name', type: 'text', autoComplete: 'name', max: 100 },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', max: 30 },
  { name: 'location', label: 'Location (area, city)', type: 'text', autoComplete: 'address-level2', max: 200 },
  { name: 'instagram', label: 'Instagram', type: 'text', autoComplete: 'off', max: 100 },
  { name: 'college', label: 'College and course', type: 'text', autoComplete: 'off', max: 200 },
  { name: 'linkedin', label: 'LinkedIn', type: 'text', autoComplete: 'off', max: 300 },
];

/** The short labels on the card (the form spells some out). */
const ROW_LABEL: Record<ChangeableField, string> = {
  name: 'Name',
  phone: 'Phone',
  location: 'Location',
  college: 'College',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

interface Props {
  email: string;
  current: DetailValues;
  change: DetailsChange | null;
  /** Dates formatted on the server, so the page and the browser agree. */
  requestedOn: string | null;
  decidedOn: string | null;
  /** Three declines in a row: requests are closed until the librarian re-opens them. */
  closed: boolean;
  /** Declined or closed accounts can't ask for changes. */
  canRequest: boolean;
}

/** A profile link, only ever to the site it names. */
function profileHref(field: 'instagram' | 'linkedin', value: string): string | null {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (field === 'instagram') {
    const handle = text.replace(/^@/, '');
    return /^[\w.]{1,30}$/.test(handle) ? `https://www.instagram.com/${handle}/` : null;
  }
  return /^(www\.)?linkedin\.com\//i.test(text) ? `https://${text}` : null;
}

/**
 * The Details tab (M3-BORROWING.md §10, PLAN.md "Account and desk
 * rework"): every detail on its own row. Members can't edit their record
 * directly: "Edit details" turns the card into a form in place, and what
 * they send waits at the desk as a change request. A
 * waiting request shows on its own rows ("98… → 99…, waiting"), with Edit
 * and Withdraw; a declined one shows the librarian's note; three declines
 * in a row close requests.
 */
export default function DetailsCard({ email, current, change, requestedOn, decidedOn, closed, canRequest }: Props) {
  const [open, setOpen] = useState(false);
  const [withdrawing, startWithdraw] = useTransition();
  const [state, formAction, pending] = useActionState<ChangeState, FormData>(async (previous, form) => {
    const result = await requestChange(previous, form);
    if (result.status === 'sent') setOpen(false);
    return result;
  }, { status: 'idle' });

  const waiting = change?.status === 'pending' ? change : null;
  const declined = change?.status === 'declined' ? change : null;

  if (open) {
    // Editing a waiting request starts from what they asked for.
    const start = { ...current, ...(waiting?.new_values ?? {}) };
    return (
      <form action={formAction} className="details-form">
        <h2 className="account-heading">{waiting ? 'Edit your request' : 'Edit your details'}</h2>
        {FIELDS.map(({ name, label, type, autoComplete, max }) => (
          <label key={name}>
            <span>{label}</span>
            <input
              name={name}
              type={type}
              defaultValue={start[name] ?? ''}
              required={name === 'name' || name === 'phone'}
              autoComplete={autoComplete}
              maxLength={max}
            />
          </label>
        ))}
        <label>
          <span>A note to me (optional)</span>
          <textarea name="note" rows={2} maxLength={500} defaultValue={waiting?.member_note ?? ''} />
        </label>
        <p className="member-hint">
          I&rsquo;ll look it over and update your card. To change your email, ask me: it&rsquo;s how you
          sign in.
        </p>
        {state.status === 'error' && (
          <p className="member-error" role="alert">
            {state.message}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Sending…' : 'Send request'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  /** A value, or what it was and what they've asked for while a change waits. */
  function value(field: ChangeableField, display: ReactNode): ReactNode {
    if (!waiting || !(field in waiting.new_values)) return display;
    const wanted = waiting.new_values[field];
    return (
      <span className="details-change">
        {current[field] ? <del>{current[field]}</del> : <span className="details-none">none</span>}
        {' → '}
        {wanted ? <ins>{wanted}</ins> : <span className="details-none">removed</span>}
        <span className="details-waiting"> (waiting)</span>
      </span>
    );
  }

  /** As it shows when nothing's waiting: "Not given" when empty; profiles as links. */
  function shown(field: ChangeableField): ReactNode {
    const text = current[field];
    if (!text) return <span className="details-none">Not given</span>;
    if (field === 'instagram' || field === 'linkedin') {
      const href = profileHref(field, text);
      if (href) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        );
      }
    }
    return text;
  }

  return (
    <div className="details-card">
      <dl className="details-rows">
        <div>
          <dt>{ROW_LABEL.name}</dt>
          <dd>{value('name', shown('name'))}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            {email} <span className="details-aside">ask me to change it</span>
          </dd>
        </div>
        {(['phone', 'location', 'college', 'instagram', 'linkedin'] as const).map((field) => (
          <div key={field}>
            <dt>{ROW_LABEL[field]}</dt>
            <dd>{value(field, shown(field))}</dd>
          </div>
        ))}
      </dl>

      {waiting && (
        <div className="change-box">
          <span className="account-heading">
            Change requested{requestedOn ? ` ${requestedOn}` : ''} · waiting for me
          </span>
          {waiting.member_note && <p className="member-copy member-note">&ldquo;{waiting.member_note}&rdquo;</p>}
          <p className="change-actions">
            <button type="button" className="text-button" onClick={() => setOpen(true)} disabled={withdrawing}>
              Edit request
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => startWithdraw(() => withdrawChange())}
              disabled={withdrawing}
            >
              {withdrawing ? 'Withdrawing…' : 'Withdraw'}
            </button>
          </p>
        </div>
      )}

      {!waiting && declined && (
        <div className="change-box">
          <span className="account-heading">Change request{decidedOn ? ` of ${decidedOn}` : ''} declined</span>
          {declined.librarian_note && (
            <p className="member-copy member-note">&ldquo;{declined.librarian_note}&rdquo;</p>
          )}
        </div>
      )}

      {canRequest && !waiting && (
        closed ? (
          <p className="member-hint">Change requests are closed for now. Ask me if something needs updating.</p>
        ) : (
          <p className="details-request">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
              Edit details
            </button>
          </p>
        )
      )}
    </div>
  );
}
