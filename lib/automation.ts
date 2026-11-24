import { timingSafeEqual } from 'node:crypto';
import { isDatabaseConfigured } from '@/lib/db';

/**
 * The guard on the endpoints only Activepieces calls (/api/automation/*,
 * M3-BORROWING.md §14): the `x-library-secret` header must match
 * AUTOMATION_SECRET. Returns the response to send when it doesn't (503
 * when the site isn't set up, 401 for a wrong or missing secret), or null
 * when the caller may go ahead.
 */
export function automationGuard(request: Request): Response | null {
  const secret = process.env.AUTOMATION_SECRET;
  if (!secret || !isDatabaseConfigured) {
    return Response.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }
  if (!secretMatches(request.headers.get('x-library-secret'), secret)) {
    return Response.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }
  return null;
}

/** Compared in constant time, so the secret can't be guessed a character at a time. */
function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
