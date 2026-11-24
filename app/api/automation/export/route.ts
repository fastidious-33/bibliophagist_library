import { automationGuard } from '@/lib/automation';
import { EXPORT_COLUMNS, loansForExport } from '@/lib/reminders';

/**
 * GET /api/automation/export: every loan, for the weekly backup to the
 * "Library loans backup" Google Sheet (Activepieces Flow 2 on Sundays;
 * M3-BORROWING.md §12, §16.5).
 *
 * Only Activepieces can call it (the `x-library-secret` header). Each row
 * is: call number, title, member (or "Name (left)"), lent, due, returned,
 * handover. No phone, email or address.
 *
 *   200  { ok: true, columns: [...], values: [[...], ...], rows: [{ "Call number": ..., ... }] }
 *        `values` (rows as lists) and `rows` (rows as objects keyed by the
 *        column names) hold the same data, for whichever Google Sheets step
 *        Activepieces offers.
 *   401  wrong or missing secret
 *   503  the site isn't set up yet
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const refused = automationGuard(request);
  if (refused) return refused;

  const values = await loansForExport();
  const rows = values.map((row) => Object.fromEntries(EXPORT_COLUMNS.map((column, i) => [column, row[i]])));
  return Response.json(
    { ok: true, columns: EXPORT_COLUMNS, values, rows },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
