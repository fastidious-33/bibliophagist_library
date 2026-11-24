import { automationGuard } from '@/lib/automation';
import { takeReminders } from '@/lib/reminders';

/**
 * GET /api/automation/due: today's reminder list for Activepieces Flow 2,
 * the daily run at 09:00 India time (M3-BORROWING.md §12, §16.5).
 *
 * Only Activepieces can call it (the `x-library-secret` header). It also
 * runs the daily upkeep (pauses, the declined archive). Each reminder is
 * marked sent as it's handed out, so a second call the same day answers
 * with an empty list. No phone numbers or addresses.
 *
 *   200  { ok: true, items: [{ kind, to, name, book, due, due_on, days_overdue? }] }
 *   401  wrong or missing secret
 *   503  the site isn't set up yet
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const refused = automationGuard(request);
  if (refused) return refused;

  const items = await takeReminders();
  return Response.json({ ok: true, items }, { headers: { 'Cache-Control': 'no-store' } });
}
