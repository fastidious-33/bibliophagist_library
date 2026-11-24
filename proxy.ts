import { NextResponse, type NextRequest } from 'next/server';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';

/**
 * Members-only pages (M3). Signed-out visitors to /account go to /signin;
 * to /desk, to the librarian's sign-in (/signin?next=/desk), which brings
 * them back to the desk. It also finishes a sign-in: Google and the email
 * links return to /account or /desk (the callbackURL /signin sets), and
 * this is what turns that return trip into the login cookie, so
 * callbackURL must stay on a path listed in the matcher below. When it
 * can't (the browser didn't send the cookie that goes with the link), the
 * visitor lands on /signin, which finishes the sign-in itself
 * (app/signin/FinishSignIn.tsx).
 *
 * It runs only on those paths, so every other page stays cached and never
 * waits on it. Whether you're the librarian is checked by /desk itself.
 */
type Middleware = ReturnType<ReturnType<typeof getAuth>['middleware']>;

let forAccount: Middleware | undefined;
let forDesk: Middleware | undefined;

export default function proxy(request: NextRequest) {
  // Without the sign-in settings (Vercel before launch), let the request
  // through: the page shows what it would without a login.
  if (!isAuthConfigured) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/desk')) {
    forDesk ??= getAuth().middleware({ loginUrl: '/signin?next=/desk' });
    return forDesk(request);
  }
  forAccount ??= getAuth().middleware({ loginUrl: '/signin' });
  return forAccount(request);
}

export const config = {
  matcher: ['/account/:path*', '/desk/:path*'],
};
