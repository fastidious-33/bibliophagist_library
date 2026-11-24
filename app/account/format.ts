/**
 * Dates and counts as /account writes them, in India time. Plain functions
 * (not components), so reading the clock here is fine for React's purity
 * rule, like isOverdue in lib/desk-loans.ts.
 */

const IST = 'Asia/Kolkata';

const fullFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: IST });
const monthYearFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: IST });
const yearFormat = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: IST });

/** "3 Dec 2026" */
export function formatDate(value: string | Date): string {
  return fullFormat.format(new Date(value));
}

/** "3 Dec" this year, "3 Dec 2027" otherwise. */
export function formatDay(value: string | Date): string {
  const date = new Date(value);
  return yearOf(date) === yearOf(new Date()) ? dayMonthFormat.format(date) : fullFormat.format(date);
}

/** "Mar 2026" */
export function formatMonth(value: string | Date): string {
  return monthYearFormat.format(new Date(value));
}

/** The year in India. */
export function yearOf(value: string | Date): number {
  return Number(yearFormat.format(new Date(value)));
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** "1 book", "3 books". */
export function books(n: number): string {
  return `${n} ${n === 1 ? 'book' : 'books'}`;
}
