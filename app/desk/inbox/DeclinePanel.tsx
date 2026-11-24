'use client';

import { useContext, useRef, useState, useTransition } from 'react';
import type { DeskResult } from '../DeskForm';
import { InboxContext } from './InboxShell';

type Action = (previous: DeskResult, form: FormData) => Promise<DeskResult>;

interface Props {
  action: Action;
  fields: [string, string][];
  /** Ready-made reasons: tapping one fills the note, which can still be edited. */
  chips: string[];
  label?: string;
  /** The send button, e.g. "Decline request". */
  send?: string;
  advance?: boolean;
  /** d opens it on a laptop. */
  shortcut?: boolean;
}

/**
 * "Decline" without a fold-out form: it opens reason chips and a note in
 * place (they see the note), then sends. "Write your own…" clears the note
 * to type one.
 */
export default function DeclinePanel({
  action,
  fields,
  chips,
  label = 'Decline',
  send = 'Send decline',
  advance = true,
  shortcut = false,
}: Props) {
  const { done } = useContext(InboxContext);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  function run() {
    const form = new FormData();
    for (const [name, value] of fields) form.append(name, value);
    form.append('note', note.trim());
    setError(null);
    startTransition(async () => {
      try {
        const result = await action({}, form);
        if (result.error) setError(result.error);
        else {
          setOpen(false);
          done('Declined', advance);
        }
      } catch {
        setError('That didn’t work. Reload the desk and try again.');
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
        data-shortcut={shortcut ? 'd' : undefined}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="inbox-decline">
      <div className="inbox-chips" role="group" aria-label="Reasons">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={`inbox-chip${note === chip ? ' is-on' : ''}`}
            aria-pressed={note === chip}
            onClick={() => setNote(chip)}
          >
            {chip}
          </button>
        ))}
        <button
          type="button"
          className="inbox-chip"
          onClick={() => {
            setNote('');
            noteRef.current?.focus();
          }}
        >
          Write your own…
        </button>
      </div>
      <label className="inbox-decline-note">
        <span>A note they&rsquo;ll see (optional)</span>
        <textarea ref={noteRef} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={run} disabled={pending}>
          {pending ? 'Declining…' : send}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
      </div>
      {error && (
        <p className="member-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
