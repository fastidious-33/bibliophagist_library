/**
 * Times and dates as the inbox writes them. Plain functions (not
 * components), so reading the clock here is fine for React's purity rule.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** How long something has waited: "now", "5h", "3d", "2w". */
export function waited(since: string): string {
  const ms = Date.now() - new Date(since).getTime();
  if (ms < HOUR) return 'now';
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  if (ms < 14 * DAY) return `${Math.floor(ms / DAY)}d`;
  return `${Math.floor(ms / (7 * DAY))}w`;
}

const IST = 'Asia/Kolkata';
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: IST });
const full = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });
const year = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: IST });

/** "7 Dec" this year, "7 Dec 2027" otherwise. A YYYY-MM-DD date is read as that day in India. */
export function day(value: string | Date): string {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
  return year.format(date) === year.format(new Date()) ? dayMonth.format(date) : full.format(date);
}
