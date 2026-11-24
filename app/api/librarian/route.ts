import { librarian } from '@/lib/desk';

/**
 * GET /api/librarian: "is whoever's asking the librarian?" The header's
 * account link (components/AccountLink.tsx) asks once a visit, after
 * someone signs in, to show "The desk" instead of "Your account". The
 * librarians' emails stay on the server (LIBRARIAN_EMAILS); this only ever
 * answers about the asker, true or false, which /desk's "not found" already
 * tells anyone who isn't.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await librarian().catch(() => null);
  return Response.json(
    { librarian: Boolean(me) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
