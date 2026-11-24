import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Painting from '@/components/Painting';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import { JOIN_FORM_URL } from '@/lib/site';
import FinishSignIn from './FinishSignIn';
import SignInForm from './SignInForm';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

// Personal: whether you're already signed in decides what it shows.
export const dynamic = 'force-dynamic';

/**
 * Where a sign-in ends up: the librarian's sign-in (?next=/desk, where
 * proxy.ts sends signed-out visits to /desk) returns to the desk; every
 * other sign-in to /account. Only these two, so the page can't be used to
 * send anyone to another site.
 */
export type SignInDestination = '/account' | '/desk';

function destination(value: string | string[] | undefined): SignInDestination {
  return value === '/desk' ? '/desk' : '/account';
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Before launch the live site has no sign-in settings: no page either.
  if (!isAuthConfigured) notFound();

  const params = await searchParams;
  const next = destination(params.next);

  const { data: session } = await getAuth().getSession();
  if (session?.user) redirect(next);

  const forDesk = next === '/desk';
  // An email link or Google whose return trip proxy.ts couldn't finish
  // arrives here with this one-time code: finish it in the browser.
  const finishing = Boolean(params.neon_auth_session_verifier);

  return (
    <section className="section section--flush signin-room">
      <div className="member-card stamp-card">
        <Painting slot="signin" className="signin-card-painting" priority sizes="(max-width: 560px) 100vw, 480px" />
        <span className="stamp-label">{forDesk ? 'The desk' : 'Members'}</span>
        {finishing ? (
          <FinishSignIn next={next} joinUrl={forDesk ? '' : JOIN_FORM_URL} />
        ) : (
          <>
            <h1 className="member-title">{forDesk ? 'Librarian sign-in' : 'Sign in'}</h1>
            <p className="member-copy">
              {forDesk
                ? 'Sign in with your librarian email: by link or with Google.'
                : 'No password: I’ll email you a link, or you can use Google. Use the email you joined with.'}
            </p>
            <SignInForm next={next} joinUrl={forDesk ? '' : JOIN_FORM_URL} />
          </>
        )}
      </div>
    </section>
  );
}
