import { getAuth, isAuthConfigured } from '@/lib/auth/server';

/**
 * Neon Auth's own routes (sending sign-in links, the Google round trip,
 * sessions, signing out), proxied through this site so the login cookie is
 * ours. Without the sign-in settings (Vercel before launch) every call
 * answers 503 instead of failing the build.
 */
type Handler = ReturnType<ReturnType<typeof getAuth>['handler']>['GET'];

const handle: Handler = async (request, context) => {
  if (!isAuthConfigured) {
    return Response.json({ error: 'Sign-in is not set up on this site yet.' }, { status: 503 });
  }
  // One handler serves every method; it reads the method from the request.
  return getAuth().handler().GET(request, context);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
