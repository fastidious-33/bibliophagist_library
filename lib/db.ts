import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * The members database (M3): Neon Postgres, tables in db/schema.sql.
 * Server code only. DATABASE_URL isn't a NEXT_PUBLIC_ variable, so it never
 * reaches the browser, and every read or write goes through the site's
 * server code, which checks who's asking first (M3-BORROWING.md §9).
 *
 * The driver talks to Neon over HTTP, one request per query: no connections
 * to open, pool or leak in Vercel's short-lived functions. A few steps that
 * must all happen or none (lending a book, deleting an account) go through
 * `db().transaction([...])`.
 *
 * Created on first use, so a build without DATABASE_URL (Vercel before
 * launch) still succeeds.
 *
 *   const rows = await db()`select id, status from members where email = ${email}`;
 */
let client: NeonQueryFunction<false, false> | undefined;

/** True when this deployment has a database. */
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('The members database is not set up: DATABASE_URL is missing.');
    client = neon(url);
  }
  return client;
}
