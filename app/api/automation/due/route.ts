import { automationGuard } from '@/lib/automation';
import { runDaily } from '@/lib/reminders';

/**
 * GET /api/automation/due: the daily run (M3-BORROWING.md §12), woken each
 * morning by Vercel Cron (vercel.json, 03:30 UTC = 09:00 in India).
 *
 * It runs the upkeep (pauses, the declined archive), then sends each
 * member's reminders as one email and the librarian's digest, all through
 * Activepieces Flow 1. Reminders are marked sent as they're picked, so a
 * second call the same day sends nothing new.
 *
 * Called by Vercel Cron (`Authorization: Bearer <CRON_SECRET>`) or by hand
 * with the automation secret (`x-library-secret`), e.g. to test.
 *
 *   200  { ok: true, reminders, emails, digest, skipped? }
 *   401  wrong or missing secret
 *   503  the site isn't set up yet
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const refused = automationGuard(request, { allowCron: true });
  if (refused) return refused;

  const run = await runDaily();
  console.log('Daily run:', JSON.stringify(run));
  return Response.json({ ok: true, ...run }, { headers: { 'Cache-Control': 'no-store' } });
}
