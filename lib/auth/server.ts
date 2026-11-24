import { createNeonAuth } from '@neon/auth/next/server';

/**
 * Sign-in for members (M3): Neon Auth, Neon's managed Better Auth. Email
 * links and Google; no passwords. Logins live in Neon (the `neon_auth`
 * schema), next to our own tables; Sanity never sees anyone's details.
 *
 * Created on first use rather than at import: `next build` loads the auth
 * route and proxy.ts, and a deployment without these settings (Vercel,
 * before launch) must still build. Locally they come from .env.local
 * (`neon deploy` writes NEON_AUTH_BASE_URL; the cookie secret is added by
 * hand). See M3-BORROWING.md §15.
 */
type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | undefined;

/** True when this deployment has the sign-in settings. */
export const isAuthConfigured = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET
);

export function getAuth(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret) {
      throw new Error('Sign-in is not set up: NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are missing.');
    }
    instance = createNeonAuth({
      baseUrl,
      cookies: {
        secret,
        // 'lax', not 'strict': a sign-in link clicked in Gmail arrives from
        // another site, and a strict cookie isn't sent on that first page,
        // so you'd look signed out until the next click. (It's also the
        // installed SDK's default; set here so it doesn't depend on that.)
        sameSite: 'lax',
      },
    });
  }
  return instance;
}
