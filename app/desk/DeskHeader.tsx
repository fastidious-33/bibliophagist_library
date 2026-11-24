import type { ReactNode } from 'react';

/**
 * A desk page's heading (Out now, Members, Lend): the title and, beside it,
 * a count. No painting: the desk is a work surface; its one painting is
 * the Inbox's "all caught up".
 */
export default function DeskHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <header className="section-heading">
      <h1>{title}</h1>
      {aside && <span className="section-count">{aside}</span>}
    </header>
  );
}
