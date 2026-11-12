import type { PaintingSlot } from './paintings';
import { LIBRARIANS_PICK_TAG } from './genres/shared';

/**
 * Everything under "Browse": the /browse page's cards and the footer's
 * Browse column both read from here, so they never drift apart.
 * Each card reuses its destination's painting.
 */
export type BrowseLink = {
  href: string;
  title: string;
  blurb: string;
  slot: PaintingSlot;
};

export const BROWSE_LINKS: BrowseLink[] = [
  {
    href: '/borrow',
    title: 'How to borrow',
    blurb: 'Three steps, seven rules, ten rights.',
    slot: 'borrow',
  },
  {
    href: '/catalog',
    title: 'Search the catalog',
    blurb: 'Every book on the shelves, by title, author or tag.',
    slot: 'catalog',
  },
  {
    href: '/catalog/genres',
    title: 'Genres',
    blurb: 'Every shelf, by theme.',
    slot: 'genresIndex',
  },
  {
    href: `/catalog?${new URLSearchParams({ tags: LIBRARIANS_PICK_TAG })}`,
    title: 'Librarian’s Picks',
    blurb: 'The books I’d hand you first.',
    slot: 'browsePicks',
  },
  {
    href: '/ledger',
    title: 'The Ledger',
    blurb: 'What the library is made of, counted.',
    slot: 'ledger',
  },
];

/** Paths that sit under Browse, for the header's highlight. */
export const BROWSE_SECTIONS = ['/browse', '/catalog', '/ledger', '/borrow'];
