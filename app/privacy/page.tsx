import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs, { BROWSE } from '@/components/Breadcrumbs';
import { CONTACT } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What the library keeps about members, why, where, for how long, and how to delete it.',
};

/**
 * The privacy page (M3-BORROWING.md §10): the sign-up notice members agree
 * to on the Join form, spelled out. It describes what the site does today;
 * change it here if that changes. Linked from the footer and from Google's
 * sign-in screen ("Continue with Google").
 */
export default function PrivacyPage() {
  return (
    <section className="section section--flush">
      <Breadcrumbs trail={[BROWSE, { label: 'Privacy' }]} />
      <div className="section-heading">
        <h1>Privacy</h1>
      </div>

      <div className="prose privacy">
        <p className="prose-lg">
          This is a personal library, run by one person: me. To lend you books I need to know who you are and how
          to reach you. Here&rsquo;s what I keep, why, and how to have it deleted. Nothing is shared or sold.
        </p>

        <h2 className="subhead">What I keep</h2>
        <ul>
          <li>
            <strong>From the Join form:</strong> your name, email, phone, location and Instagram, and, if you give
            them, your status in life, college and LinkedIn, plus when you agreed to this notice.
          </li>
          <li>
            <strong>Your sign-in:</strong> your email, and your name from Google if you use &ldquo;Continue with
            Google&rdquo;. There are no passwords.
          </li>
          <li>
            <strong>Your borrowing:</strong> the books you ask for, borrow and wait for, with dates; your payments
            (deposit and membership); and any changes to your details you ask for.
          </li>
          <li>
            <strong>A courier address,</strong> only if a book goes by courier, and only until it&rsquo;s back.
          </li>
        </ul>

        <h2 className="subhead">Why</h2>
        <p>
          So I know who has which book, can reach you about it (approvals, reminders, &ldquo;it&rsquo;s back for
          you&rdquo;), and can keep track of deposits. That&rsquo;s all it&rsquo;s used for.
        </p>

        <h2 className="subhead">Where it&rsquo;s kept</h2>
        <ul>
          <li>
            <strong>Neon:</strong> the library&rsquo;s database and the sign-ins (servers in Singapore).
          </li>
          <li>
            <strong>Vercel:</strong> runs this website. It also counts page visits for me, without cookies and
            without knowing who you are.
          </li>
          <li>
            <strong>Gmail and Activepieces:</strong> send the library&rsquo;s emails to you.
          </li>
          <li>
            <strong>Tally:</strong> the Join form. I delete each form there once it reaches the library&rsquo;s own
            records.
          </li>
          <li>
            <strong>A weekly backup</strong> in Google Sheets of loans only: book, your name and dates. No phone,
            email or address.
          </li>
        </ul>
        <p>The catalog of books (Sanity) holds nothing about you.</p>

        <h2 className="subhead">How long</h2>
        <ul>
          <li>As long as you&rsquo;re a member, until you delete your account.</li>
          <li>If I can&rsquo;t approve a sign-up, its details are deleted after 30 days.</li>
          <li>
            When an account is deleted, everything about you goes, except your name on the record of the books you
            borrowed (which book, and when).
          </li>
        </ul>

        <h2 className="subhead">Your choices</h2>
        <ul>
          <li>
            <strong>See what I have:</strong> <Link href="/account">your account</Link> shows your details, payments,
            books and waitlist.
          </li>
          <li>
            <strong>Change your details:</strong> &ldquo;Edit details&rdquo; on your account. I look it over and
            update them. To change your email, ask me.
          </li>
          <li>
            <strong>Delete your account:</strong> from your account, once you have no books out. If you paid the
            deposit, I refund it.
          </li>
          <li>
            <strong>Anything else:</strong> email me at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
          </li>
        </ul>

        <h2 className="subhead">Cookies</h2>
        <p>
          Only the one that keeps you signed in. Your light or dark reading lamp is remembered in your own browser,
          not by me.
        </p>

        <p className="privacy-updated">Last updated 25 November 2026.</p>
      </div>
    </section>
  );
}
