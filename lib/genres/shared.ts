// Genre vocabulary shared by server and client code. Safe to import from
// client components — nothing here pulls in Sanity.
//
// Genres ARE tags (M1-DESIGN.md): every tag gets a page except the three
// below, which mean something else.

/** Wing tags. They become stamps on genres and books, not genre pages. */
export const FICTION_TAG = 'Fiction';
export const NON_FICTION_TAG = 'Non-Fiction';

/**
 * The tag that marks a Librarian's Pick. Exact string, straight apostrophe —
 * the home desk, the catalog filter and genre pages all match on it, so a
 * book tagged with any other spelling silently drops out of all three.
 */
export const LIBRARIANS_PICK_TAG = "Librarian's Pick";

const NOT_GENRES = new Set([FICTION_TAG, NON_FICTION_TAG, LIBRARIANS_PICK_TAG]);

export function isGenreTag(tag: string): boolean {
  return !NOT_GENRES.has(tag);
}

/** "Culture & Society" → "culture-society". */
export function genreSlug(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type Wing = 'fiction' | 'non-fiction';

export const WING_LABEL: Record<Wing, string> = {
  fiction: 'Fiction',
  'non-fiction': 'Non-Fiction',
};

/**
 * A genre gets a wing's stamp when MORE than 5% of its books carry that
 * wing's tag — so Indian Authors and Translated Works get both. Small genres
 * can change stamp when one book is added or retagged; that's expected.
 */
export const STAMP_SHARE = 0.05;

export function stampsFor(count: number, fiction: number, nonFiction: number): Wing[] {
  if (count === 0) return [];
  const stamps: Wing[] = [];
  if (fiction / count > STAMP_SHARE) stamps.push('fiction');
  if (nonFiction / count > STAMP_SHARE) stamps.push('non-fiction');
  return stamps;
}

/** A single book's own stamps, straight from its tags. */
export function bookStamps(tags: string[] | undefined): Wing[] {
  const stamps: Wing[] = [];
  if (tags?.includes(FICTION_TAG)) stamps.push('fiction');
  if (tags?.includes(NON_FICTION_TAG)) stamps.push('non-fiction');
  return stamps;
}
