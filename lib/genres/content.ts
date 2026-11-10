import type { Painting, PaintingSlot } from '@/lib/paintings';
import type { Wing } from './shared';

/** The wing's default painting slot, used until a genre has its own. */
export function defaultPaintingSlot(stamps: Wing[]): PaintingSlot {
  if (stamps.length === 2) return 'genreBoth';
  if (stamps[0] === 'non-fiction') return 'genreNonFiction';
  return 'genreFiction';
}

/**
 * The librarian's own words and pictures for each genre — all optional.
 * A genre without an entry still gets its page: title, stamps and books,
 * with the default painting for its wing (lib/paintings.ts).
 *
 * Keyed by the tag exactly as written in Studio. Rename a tag there and
 * rename its key here too. Moves to Sanity in M2.
 */
export interface GenreContent {
  /** Paragraphs, first person. */
  intro?: string[];
  /** Overrides the wing's default painting. */
  painting?: Painting;
}

export const GENRE_CONTENT: Record<string, GenreContent> = {
  // 'Fantasy Fiction': {
  //   intro: [
  //     'I started out on high fantasy and never quite left.',
  //   ],
  //   painting: {
  //     src: '/paintings/example.jpg',
  //     width: 1600,
  //     height: 1200,
  //     title: 'Title of the work',
  //     artist: 'Artist',
  //     year: '1850',
  //     sourceUrl: 'https://…',
  //     alt: 'What the painting shows',
  //   },
  // },
};
