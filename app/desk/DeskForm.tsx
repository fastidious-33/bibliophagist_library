'use client';

import { startTransition, useActionState, type FormEvent, type ReactNode } from 'react';

/** What a desk action answers: an error to show, or a short "done" note. */
export interface DeskResult {
  error?: string;
  message?: string;
}

interface Props {
  action: (previous: DeskResult, form: FormData) => Promise<DeskResult>;
  children?: ReactNode;
  /** The button's label, and while it runs. */
  submit: string;
  busy?: string;
  /** Asked first ("Remove Asha?"); cancelling sends nothing. */
  confirm?: string;
  variant?: 'primary' | 'secondary' | 'text';
  className?: string;
  /** Called after the action works (no error), e.g. to close an edit form. */
  onSuccess?: () => void;
}

/**
 * A form on the desk: the fields (server-rendered children), its button,
 * and the action's error or "done" note under it. Submitted by hand rather
 * than through the form's `action`, so the fields keep what was typed when
 * the action refuses (React clears a form after an `action` submit).
 */
export default function DeskForm({
  action,
  children,
  submit,
  busy,
  confirm,
  variant = 'primary',
  className,
  onSuccess,
}: Props) {
  const [state, formAction, pending] = useActionState(async (previous: DeskResult, form: FormData) => {
    const result = await action(previous, form);
    if (!result.error) onSuccess?.();
    return result;
  }, {});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const buttonClass =
    variant === 'text' ? 'text-button' : `btn ${variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}`;

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div className="desk-form-foot">
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? (busy ?? 'Saving…') : submit}
        </button>
        {state.message && !pending && (
          <span className="desk-done" role="status">
            {state.message}
          </span>
        )}
      </div>
      {state.error && !pending && (
        <p className="member-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
