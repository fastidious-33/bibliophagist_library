import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import { getAvailability, MAX_IDS } from '@/lib/availability';
import { isDatabaseConfigured } from '@/lib/db';
import { librarian } from '@/lib/desk';
import { findMemberForLogin, type MemberStatus } from '@/lib/members';
import { getHoldings } from '@/lib/requests';
import { MAX_WAITLISTS } from '@/lib/waitlist';

/**
 * GET /api/availability?ids=B001,B002 (M3 A3, M3-BORROWING.md §7, §14).
 * Signed-in people only: visitors get 401 and book pages show them
 * nothing. What each viewer gets:
 *   - anyone signed in: available or not;
 *   - active and paused members: also when it's due back;
 *   - the librarian: also who has it (or has it set aside).
 * Plus `viewer`, so "Request this book" can say what they can do: the
 * librarian; someone who hasn't joined; or a member's stage, how many
 * books they hold against the limit, and which of these books are theirs.
 * Never cached: it's personal and changes with every loan.
 */

export type Viewer =
  | { kind: 'librarian' }
  | { kind: 'not_joined' }
  | {
      kind: 'member';
      status: MemberStatus;
      open: number;
      limit: number;
      /** Of the asked-about books, the ones this member has asked for or has out. */
      holding: Record<string, 'request' | 'loan'>;
      /** Of the asked-about books, their place in each line they're in (1 = first). */
      waiting: Record<string, number>;
      /** How many waitlists they're on, and the most allowed. */
      waitlists: number;
      waitlistLimit: number;
    };
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  if (!isAuthConfigured || !isDatabaseConfigured) {
    return Response.json({ error: 'not_configured' }, { status: 503, headers: NO_STORE });
  }
  const { data: session } = await getAuth().getSession();
  const login = session?.user;
  if (!login) return Response.json({ error: 'sign_in' }, { status: 401, headers: NO_STORE });

  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get('ids') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => /^[\w.-]{1,100}$/.test(id)),
    ),
  ].slice(0, MAX_IDS);
  if (ids.length === 0) return Response.json({ books: {} }, { headers: NO_STORE });

  const [isLibrarian, member, availability] = await Promise.all([
    librarian().then(Boolean),
    findMemberForLogin(login),
    getAvailability(ids),
  ]);
  const seesDates = isLibrarian || member?.status === 'active' || member?.status === 'paused';

  let viewer: Viewer;
  if (isLibrarian) {
    viewer = { kind: 'librarian' };
  } else if (!member) {
    viewer = { kind: 'not_joined' };
  } else {
    const holdings = await getHoldings(member.id);
    viewer = {
      kind: 'member',
      status: member.status,
      open: holdings.open,
      limit: holdings.limit,
      holding: Object.fromEntries(
        holdings.books.filter((held) => ids.includes(held.book_id)).map((held) => [held.book_id, held.kind]),
      ),
      waiting: Object.fromEntries(
        holdings.waiting.filter((w) => ids.includes(w.book_id)).map((w) => [w.book_id, w.place]),
      ),
      waitlists: holdings.waiting.length,
      waitlistLimit: MAX_WAITLISTS,
    };
  }

  const books = Object.fromEntries(
    Object.entries(availability).map(([id, book]) => [
      id,
      {
        available: book.available,
        ...(seesDates && !book.available && book.due ? { due: book.due } : {}),
        ...(isLibrarian && book.holders.length > 0 ? { holders: book.holders } : {}),
      },
    ]),
  );
  return Response.json({ books, viewer }, { headers: NO_STORE });
}
