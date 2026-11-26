/**
 * Every email the library sends through Activepieces, worded here
 * (M3-BORROWING.md §13). Activepieces only delivers: Flow 1 sends
 * `subject` and `text` as they are, to `to`.
 *
 * To reword an email, change its block below and redeploy. Plain text, in
 * the librarian's voice. Sign-in emails are separate: Neon sends those.
 */

/** How every email ends. */
const SIGN_OFF = `— Aditya
Home of a Bibliophagist`;

export interface Email {
  subject: string;
  text: string;
}

/** What composeEmail reads from an event (lib/events.ts adds the links). */
type Fields = Record<string, unknown>;

interface Book {
  id: string;
  title: string;
  url: string | null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function firstName(name: unknown): string {
  return str(name).trim().split(/\s+/)[0] || 'there';
}

function bookOf(fields: Fields): Book {
  const book = fields.book as Book | undefined;
  return book ?? { id: '', title: 'your book', url: null };
}

/** "The Way of Kings (B123)" and, on the next line, its page. */
function bookLine(book: Book): string {
  return `${book.title}${book.id ? ` (${book.id})` : ''}${book.url ? `\n${book.url}` : ''}`;
}

/** A note from the librarian, quoted, if there is one. */
function noteLine(note: unknown): string {
  const text = str(note).trim();
  return text ? `\n\n"${text}"` : '';
}

function body(...paragraphs: string[]): string {
  return [...paragraphs.filter(Boolean), SIGN_OFF].join('\n\n');
}

/**
 * The email for one event. Unknown events get a plain fallback rather
 * than nothing, so a new event never goes out blank.
 */
export function composeEmail(event: string, f: Fields): Email {
  const hi = `Hi ${firstName(f.name)},`;
  const account = str(f.account_url);
  const book = bookOf(f);

  switch (event) {
    case 'member.approved':
      return {
        subject: 'Welcome to the library',
        text: body(
          hi,
          `You're in${f.card_no ? `: your library card is ${str(f.card_no)}` : ''}.`,
          `To start borrowing, send ₹${str(f.total)} by UPI${f.upi_id ? ` to ${str(f.upi_id)}` : ''}: the ₹${str(f.deposit)} deposit, which I refund when you leave, and ₹${str(f.subscription)} for a lifetime membership, which buys new books. I'll mark it on your account once it arrives.`,
          `Sign in with this email address to see your account and ask for books: ${str(f.signin_url)}`,
        ),
      };

    case 'member.declined':
      return {
        subject: 'About your library sign-up',
        text: body(hi, `I can't open a membership for you just now.${noteLine(f.note)}`),
      };

    case 'member.activated':
      return {
        subject: 'You can borrow now',
        text: body(
          hi,
          `Payments received, thank you. You can now ask for up to ${str(f.limit) || 'two'} books at a time, from any book's page in the catalog: ${str(f.catalog_url)}`,
        ),
      };

    case 'request.accepted':
      return {
        subject: `${book.title} is set aside for you`,
        text: body(
          hi,
          `I've set this aside for you${f.until ? ` until ${str(f.until)}` : ''}:\n${bookLine(book)}`,
          f.handover === 'courier'
            ? `You asked for it by courier. Reply here and we'll sort out sending it.`
            : `Reply here with a time that suits you for the handover.`,
        ),
      };

    case 'request.declined':
      return {
        subject: `About ${book.title}`,
        text: body(hi, `I can't lend you ${book.title} right now.${noteLine(f.note)}`),
      };

    case 'waitlist.set_aside':
      return {
        subject: `It's back: ${book.title}`,
        text: body(
          hi,
          `Good news: a book you were waiting for is back, and I've set it aside for you${f.until ? ` until ${str(f.until)}` : ''}:\n${bookLine(book)}`,
          `Reply with a time for the handover. If you don't want it any more, tell me and I'll offer it to the next in line.`,
        ),
      };

    case 'loan.lent': {
      const books = (f.books as Book[] | undefined) ?? [book];
      const one = books.length === 1;
      return {
        subject: `Happy reading: ${str(f.books_text) || book.title}`,
        text: body(
          hi,
          `${one ? 'This book is' : 'These books are'} with you now:\n${books.map(bookLine).join('\n')}`,
          `${one ? "It's" : "They're"} due back by ${str(f.due)}. Need longer? Ask for more time from your account: ${account}`,
        ),
      };
    }

    case 'loan.extended':
      return {
        subject: `More time with ${book.title}`,
        text: body(hi, `${book.title} is now due back by ${str(f.due)}.`),
      };

    case 'more_time.approved':
      return {
        subject: `More time with ${book.title}`,
        text: body(hi, `Yes, of course. ${book.title} is now due back by ${str(f.due)}.`),
      };

    case 'more_time.declined':
      return {
        subject: `About more time with ${book.title}`,
        text: body(
          hi,
          `I can't give more time on ${book.title} this time: it's still due back by ${str(f.due)}.${noteLine(f.note)}`,
        ),
      };

    case 'loan.returned':
      return {
        subject: `Thanks for bringing back ${book.title}`,
        text: body(
          hi,
          `Got ${book.title} back, thank you.${f.active_again ? ' Your account is active again, so you can borrow again.' : ''}`,
        ),
      };

    case 'member.change_decided':
      return {
        subject: 'Your library details',
        text: body(
          hi,
          `${f.decision === 'approved' ? "I've updated your details as you asked." : "I've left your details as they were."}${noteLine(f.note)}`,
          `Your account: ${account}`,
        ),
      };

    // ---- To the librarian ----

    case 'member.deleted':
      return {
        subject: `${str(f.name)} left: refund the deposit`,
        text: [
          `${str(f.name)} ${f.removed_at_desk ? 'was removed at the desk' : 'deleted their account'}.`,
          f.deposit_amount
            ? `Deposit to refund: ₹${str(f.deposit_amount)}${f.deposit_paid_on ? `, paid on ${str(f.deposit_paid_on)}` : ''}.`
            : 'No paid deposit on record.',
        ].join('\n\n'),
      };

    default:
      return { subject: `Library: ${event}`, text: body(hi, `Your account: ${account}`) };
  }
}

// ---------- The daily run (lib/reminders.ts) ----------

export interface ReminderLine {
  kind: 'due_soon' | 'due_today' | 'overdue';
  book: Book;
  due: string;
  days_overdue?: number;
}

/**
 * One member's reminders for the day, in one email: every book of theirs
 * that's due in 3 days, due today, or late.
 */
export function reminderEmail(name: string, lines: ReminderLine[], accountUrl: string): Email {
  const late = lines.filter((l) => l.kind === 'overdue');
  const today = lines.filter((l) => l.kind === 'due_today');
  const soon = lines.filter((l) => l.kind === 'due_soon');

  const subject =
    late.length > 0
      ? late.length === 1 && lines.length === 1
        ? `${late[0].book.title} is ${late[0].days_overdue} days late`
        : 'Books overdue'
      : today.length > 0
        ? lines.length === 1
          ? `${today[0].book.title} is due today`
          : 'Books due today'
        : lines.length === 1
          ? `${soon[0].book.title} is due in 3 days`
          : 'Books due in 3 days';

  const parts: string[] = [`Hi ${firstName(name)},`];
  if (late.length > 0) {
    parts.push(
      `${late.length === 1 ? 'This book is' : 'These books are'} overdue:\n${late
        .map((l) => `${bookLine(l.book)}\n  was due ${l.due}, ${l.days_overdue} days ago`)
        .join('\n')}`,
      `Until ${late.length === 1 ? "it's" : "they're"} back, new requests are paused.`,
    );
  }
  if (today.length > 0) {
    parts.push(`Due back today:\n${today.map((l) => bookLine(l.book)).join('\n')}`);
  }
  if (soon.length > 0) {
    parts.push(`Due in 3 days (${soon[0].due}):\n${soon.map((l) => bookLine(l.book)).join('\n')}`);
  }
  parts.push(`Need longer? Ask for more time from your account: ${accountUrl}`);
  return { subject, text: body(...parts) };
}

/** The morning digest to the librarian: what's waiting in the desk's inbox. */
export function digestEmail(counts: { label: string; count: number }[], deskUrl: string): Email {
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  return {
    subject: `Desk: ${total} waiting`,
    text: [
      `Waiting at the desk this morning:`,
      counts
        .filter((c) => c.count > 0)
        .map((c) => `  ${c.label}: ${c.count}`)
        .join('\n'),
      deskUrl,
    ].join('\n\n'),
  };
}
