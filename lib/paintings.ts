/**
 * Every painting on the site, in one place (M1-DESIGN.md: one public-domain
 * painting per page, with a museum-label caption).
 *
 * To hang one: put the image in public/paintings/ and fill in its slot —
 * `src` plus the label fields. A slot left as `null` renders an empty frame
 * ("A painting will hang here."), so a page never breaks for want of one.
 */
export type Painting = {
  /** Path under public/, e.g. '/paintings/spitzweg-bookworm.jpg'. */
  src: string;
  /** Pixel size of the file, so the frame reserves the right space. */
  width: number;
  height: number;
  title: string;
  artist: string;
  /** As museums write it: '1850', 'c. 1660', '1608–10'. */
  year: string;
  /** Where it came from, e.g. the museum's page for the object. Optional. */
  sourceUrl?: string;
  /** Describes the scene for screen readers; the caption names the work. */
  alt: string;
};

/**
 * Every place a painting hangs. Later groups add their pages' slots here.
 * The three genre slots are defaults by stamp; a genre can override its
 * own in lib/genres/content.ts.
 */
export type PaintingSlot =
  | 'homeHero'
  | 'doorCatalog'
  | 'doorLibrarian'
  | 'catalog'
  | 'genresIndex'
  | 'genreFiction'
  | 'genreNonFiction'
  | 'genreBoth'
  | 'borrow'
  | 'ledger'
  | 'librarian'
  | 'librarianWritings'
  | 'librarianFeatured'
  | 'librarianSaved'
  | 'librarianBodyArt'
  | 'librarianMusic';

export const PAINTINGS: Record<PaintingSlot, Painting | null> = {
  homeHero: null,
  doorCatalog: null,
  doorLibrarian: null,
  catalog: null,
  genresIndex: null,
  genreFiction: null,
  genreNonFiction: null,
  genreBoth: null,
  borrow: null,
  ledger: null,
  librarian: null,
  librarianWritings: null,
  librarianFeatured: null,
  librarianSaved: null,
  librarianBodyArt: null,
  librarianMusic: null,
};
