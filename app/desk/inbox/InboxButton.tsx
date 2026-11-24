'use client';

import { useContext, useState, useTransition } from 'react';
import type { DeskResult } from '../DeskForm';
import { InboxContext } from './InboxShell';

type Action = (previous: DeskResult, form: FormData) => Promise<DeskResult>;

interface Props {
  action: Action;
  /** The ids it acts on, as [name, value] pairs (a name may repeat). */
  fields: [string, string][];
  label: string;
  busy?: string;
  /** The word stamped on the item when it works ("Approved"). */
  stamp: string;
  /** Move on to the next item afterwards (default yes). */
  advance?: boolean;
  variant?: 'primary' | 'secondary';
  /** Asked first; cancelling sends nothing. */
  confirm?: string;
  /** A laptop key that presses it: a (accept/approve) or e (extend: focuses it). */
  shortcut?: 'a' | 'e';
}

/**
 * One action on an inbox card. On success the inbox stamps the item and
 * moves on; on an error the item stays, with the error under the button.
 * The ids travel with the button, so a key press can only ever act on the
 * item it belongs to.
 */
export default function InboxButton({
  action,
  fields,
  label,
  busy,
  stamp,
  advance = true,
  variant = 'primary',
  confirm,
  shortcut,
}: Props) {
  const { done } = useContext(InboxContext);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (confirm && !window.confirm(confirm)) return;
    const form = new FormData();
    for (const [name, value] of fields) form.append(name, value);
    setError(null);
    startTransition(async () => {
      try {
        const result = await action({}, form);
        if (result.error) setError(result.error);
        else done(stamp, advance);
      } catch {
        setError('That didn’t work. Reload the desk and try again.');
      }
    });
  }

  return (
    <span className="inbox-button">
      <button
        type="button"
        className={`btn ${variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}`}
        onClick={run}
        disabled={pending}
        data-shortcut={shortcut}
      >
        {pending ? (busy ?? 'Saving…') : label}
      </button>
      {error && (
        <span className="member-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
