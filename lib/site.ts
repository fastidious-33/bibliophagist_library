export const SITE_URL = 'https://bibliophagist-library.vercel.app';

/**
 * The Tally Join form ("Do You Want to Borrow A Book?"), M3-BORROWING.md
 * §16.7. Empty until NEXT_PUBLIC_JOIN_FORM_URL is set; the Join buttons are
 * then hidden.
 */
export const JOIN_FORM_URL: string = process.env.NEXT_PUBLIC_JOIN_FORM_URL ?? '';

/** The Join form with the email filled in (its hidden `email` field). */
export function joinFormUrl(email?: string | null): string {
  if (!JOIN_FORM_URL) return '';
  if (!email) return JOIN_FORM_URL;
  const url = new URL(JOIN_FORM_URL);
  url.searchParams.set('email', email);
  return url.toString();
}

/** Where to find the librarian. The email is a placeholder (M1-DESIGN.md). */
export const CONTACT = {
  substack: 'https://abibliophagist.substack.com/',
  instagram: 'https://www.instagram.com/a.bibliophagist/',
  email: 'rajwadeaditya@gmail.com',
};
