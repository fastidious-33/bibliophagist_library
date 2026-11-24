import { extendChoices, MAX_LOAN_MONTHS } from '@/lib/desk-loans';
import { extendByAction } from './actions';
import { day } from './inbox/format';
import InboxButton from './inbox/InboxButton';

/**
 * +15 days · +30 days · +45 days for one loan (Out now rows and the
 * inbox's overdue card). A choice that takes it past MAX_LOAN_MONTHS from
 * lending asks first, then goes ahead.
 */
export default function ExtendChoices({
  loan,
  compact = false,
  shortcut = false,
}: {
  loan: { id: string; book_title: string; lent_at: string; due_at: string };
  /** "+15d" instead of "+15 days", for table rows. */
  compact?: boolean;
  /** e focuses the first one, in the inbox. */
  shortcut?: boolean;
}) {
  return (
    <span className="inbox-presets" role="group" aria-label={`Extend ${loan.book_title}`}>
      {extendChoices(loan).map((choice, index) => {
        const fields: [string, string][] = [
          ['loanId', loan.id],
          ['preset', choice.preset],
        ];
        if (choice.pastLimit) fields.push(['allowLonger', 'on']);
        return (
          <InboxButton
            key={choice.preset}
            action={extendByAction}
            fields={fields}
            label={compact ? choice.label.replace(' days', 'd') : choice.label}
            busy="…"
            stamp="Extended"
            variant="secondary"
            shortcut={shortcut && index === 0 ? 'e' : undefined}
            confirm={
              choice.pastLimit
                ? `That makes it due ${day(choice.dueOn)}, more than ${MAX_LOAN_MONTHS} months after it was lent (${day(loan.lent_at)}). Extend anyway?`
                : undefined
            }
          />
        );
      })}
    </span>
  );
}
