'use client';

// First: supplies crypto.randomUUID on plain-http addresses (a phone on the
// dev server), which @neon/auth needs as it loads.
import './uuid-fallback';
import { createAuthClient } from '@neon/auth/next';

/**
 * The browser side of sign-in: the email-link form, "Continue with Google",
 * the header's signed-in name and signing out (M3 A1b). It talks only to
 * this site's own /api/auth routes, so it takes no settings.
 */
export const authClient = createAuthClient();
