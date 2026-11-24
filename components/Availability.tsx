/**
 * The availability badge (M3 A3, §7): "Available" or "On loan", with the
 * due date for active members and who has it for the librarian, as
 * /api/availability sent it. Rendered by BorrowPanel on book pages.
 */

export interface BookAnswer {
  available: boolean;
  due?: string;
  holders?: { name: string; due: string | null }[];
}

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** A YYYY-MM-DD date as "12 Jan". */
export function formatDay(date: string): string {
  return shortDate.format(new Date(`${date}T00:00:00Z`));
}

export default function Availability({ book }: { book: BookAnswer }) {
  const holders = book.holders ?? [];
  let detail = '';
  if (holders.length > 0) {
    detail = holders
      .map((h) => (h.due ? `with ${h.name}, due ${formatDay(h.due)}` : `set aside for ${h.name}`))
      .join('; ');
  } else if (!book.available && book.due) {
    detail = `back around ${formatDay(book.due)}`;
  }

  return (
    <p className={`availability${book.available ? ' is-available' : ' is-out'}`}>
      <span className="availability-mark">{book.available ? 'Available' : 'On loan'}</span>
      {detail && <span className="availability-detail">{detail}</span>}
    </p>
  );
}
