import type { Wing } from './shared';

/**
 * Genre families: the Story wheel's middle ring (PLAN.md, "The Story of
 * the Shelves"). The tags aren't a tree, so this list is the tree, chosen
 * by the librarian. Edit freely: move a genre, rename or add a family.
 *
 * - Names must match the tags exactly. A tag listed nowhere (a new one, or
 *   a Non-fiction genre on a Fiction book) falls into that wing's "Other"
 *   until it's placed here.
 * - A genre can sit in one family per wing; it can appear under both wings
 *   (Culture & Society is Literary on the Fiction side, World & Society on
 *   the Non-fiction side).
 * - `audience`: families that are about who a book is for or its format
 *   rather than its subject (Young Readers, Comics). A book only goes to
 *   one of these when it has no subject genre at all, so a young-adult
 *   fantasy counts under Fantasy.
 */
export type Family = { name: string; wing: Wing; genres: string[]; audience?: boolean };

export const FAMILIES: Family[] = [
  // Fiction
  { name: 'Fantasy', wing: 'fiction', genres: ['Fantasy Fiction', 'High Fantasy', 'Magical Realism'] },
  { name: 'Myth', wing: 'fiction', genres: ['Mythology', 'Folktales'] },
  { name: 'Crime & Thrillers', wing: 'fiction', genres: ['Thriller', 'Crime Fiction', 'Espionage', 'Legal Fiction'] },
  {
    name: 'Literary',
    wing: 'fiction',
    genres: [
      'Literary Fiction',
      'Classics',
      'Historical Fiction',
      'Surrealism',
      'Novella',
      // Genres from the other wing, on Fiction books.
      'Culture & Society',
      'Politics',
      'Literature',
      'History',
      'Biography',
      'Philosophy',
      'Geography',
      'Journalistic Pieces',
      'Hindi',
    ],
  },
  { name: 'Light & Lovely', wing: 'fiction', genres: ['Humor', 'Romance', 'Satire'] },
  { name: 'Speculative', wing: 'fiction', genres: ['Sci-Fi', 'Dystopian Fiction', 'Cyberpunk'] },
  { name: 'Dark & Uncanny', wing: 'fiction', genres: ['Ghost Stories', 'Horror'] },
  { name: 'Young Readers', wing: 'fiction', genres: ['Children', 'Young Adult'], audience: true },
  { name: 'Comics', wing: 'fiction', genres: ['Comics', 'Comic Strips'], audience: true },

  // Non-fiction
  { name: 'Lives & History', wing: 'non-fiction', genres: ['History', 'Biography'] },
  {
    name: 'World & Society',
    wing: 'non-fiction',
    genres: ['Culture & Society', 'Politics', 'Journalistic Pieces', 'Travel', 'Geography'],
  },
  { name: 'Ideas & Belief', wing: 'non-fiction', genres: ['Philosophy', 'Religion'] },
  { name: 'Money, Maths & Science', wing: 'non-fiction', genres: ['Finance', 'Mathematics', 'Science'] },
  { name: 'Words', wing: 'non-fiction', genres: ['Literature', 'Grammar', 'Hindi'] },
];

/** Where an unplaced genre goes, per wing. Not selectable. */
export const OTHER_FAMILY = 'Other';

const byWingGenre = new Map(FAMILIES.flatMap((f) => f.genres.map((g) => [`${f.wing}|${g}`, f] as const)));

/** The family a genre belongs to in a wing, if it's been placed. */
export function familyOf(wing: Wing, genre: string): Family | undefined {
  return byWingGenre.get(`${wing}|${genre}`);
}

/** Every genre in families of this name (either wing), for filtering. */
export function familyGenres(name: string): Set<string> {
  return new Set(FAMILIES.filter((f) => f.name === name).flatMap((f) => f.genres));
}

/** The family names, each once, in list order. */
export const FAMILY_NAMES = Array.from(new Set(FAMILIES.map((f) => f.name)));
