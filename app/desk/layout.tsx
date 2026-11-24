import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import { librarian } from '@/lib/desk';
import DeskNav from './DeskNav';

/**
 * The desk's frame (PLAN.md "Account and desk rework", B3): Inbox · Out now
 * · Waitlist · Members · Lend, a search box (members and books), and Sign
 * out, around every desk page. A sidebar on a
 * laptop; tabs along the top on a phone. Anyone but the librarian gets
 * "not found" (each page checks again, and every action does too).
 */
export default async function DeskLayout({ children }: { children: ReactNode }) {
  const me = await librarian();
  if (!me) notFound();

  return (
    <div className="desk-frame">
      <aside className="desk-side" aria-label="The desk">
        <p className="desk-side-title">The desk</p>
        <form action="/desk/search" role="search" className="desk-side-search">
          <label>
            <span className="visually-hidden">Search members and books</span>
            <input type="search" name="q" placeholder="Members or books" autoComplete="off" />
          </label>
        </form>
        <DeskNav />
        <div className="desk-side-foot">
          <span className="desk-side-who">{me.email}</span>
          <SignOutButton />
        </div>
      </aside>
      <div className="desk-main">{children}</div>
    </div>
  );
}
