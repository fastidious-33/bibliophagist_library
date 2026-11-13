import { unstable_cache } from 'next/cache';
import { sanityClient, isSanityConfigured } from './client';

/**
 * The Librarian rooms' lists and intros (M2), from Sanity's
 * Heading → Subheading → Entry documents. Each room page asks for the
 * heading tied to its key; a new heading in Studio never makes a new page.
 */

/** One linked item: a piece of writing, a feature, a newsletter. */
export type Entry = {
  title: string;
  url: string;
  /** Where it lives: the publication, outlet or account. */
  source?: string;
  /** ISO date, 'YYYY-MM-DD'. */
  date?: string;
  blurb?: string;
};

/** A subheading and its entries. `id` is its anchor, the #… on the page. */
export type EntryGroup = { id?: string; heading: string; entries: Entry[] };

export type RoomKey = 'writings' | 'featured' | 'saved' | 'bookmarks' | 'music';

export type RoomContent = {
  title: string;
  /** Paragraphs; Studio separates them with a blank line. */
  intro: string[];
  /** The P.S. after the lists. */
  note?: string;
  groups: EntryGroup[];
};

/** Cache tag for room content; the Sanity webhook refreshes it. */
export const CONTENT_TAG = 'content';

// Unnumbered items sort last (coalesce to a huge number), then by title.
const ROOM_QUERY = `*[_type == "heading" && key == $key][0]{
  title,
  intro,
  note,
  "groups": *[_type == "subheading" && references(^._id)] | order(coalesce(order, 1e9) asc, title asc) {
    "id": anchor.current,
    "heading": title,
    "entries": *[_type == "entry" && references(^._id)] | order(coalesce(order, 1e9) asc, title asc) {
      title,
      "url": link,
      source,
      date,
      "blurb": comment
    }
  }
}`;

type Maybe<T> = T | null | undefined;

type RawRoom = {
  title: string;
  intro?: Maybe<string>;
  note?: Maybe<string>;
  groups: {
    id?: Maybe<string>;
    heading: string;
    entries: {
      title: string;
      url: string;
      source?: Maybe<string>;
      date?: Maybe<string>;
      blurb?: Maybe<string>;
    }[];
  }[];
};

const paragraphs = (text: Maybe<string>): string[] =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

function toRoom(raw: RawRoom): RoomContent {
  return {
    title: raw.title,
    intro: paragraphs(raw.intro),
    note: raw.note?.trim() || undefined,
    groups: (raw.groups ?? []).map((g) => ({
      id: g.id ?? undefined,
      heading: g.heading,
      entries: (g.entries ?? []).map((e) => ({
        title: e.title,
        url: e.url,
        source: e.source ?? undefined,
        date: e.date ?? undefined,
        blurb: e.blurb ?? undefined,
      })),
    })),
  };
}

/**
 * Throws on a Sanity failure rather than returning null, because a thrown
 * call isn't stored, so a blip can never be cached as an empty room.
 */
const loadRoom = unstable_cache(
  async (key: RoomKey): Promise<RoomContent | null> => {
    const raw = await sanityClient!.fetch<RawRoom | null>(ROOM_QUERY, { key });
    return raw ? toRoom(raw) : null;
  },
  ['librarian-room'],
  { tags: [CONTENT_TAG], revalidate: 3600 }
);

/**
 * A room's heading, intro, note and lists, or null when there is no such
 * heading or Sanity can't be reached. Pages show an honest empty line then;
 * there is no hardcoded fallback copy.
 */
export async function getRoom(key: RoomKey): Promise<RoomContent | null> {
  if (!isSanityConfigured || !sanityClient) return null;
  try {
    return await loadRoom(key);
  } catch (err) {
    console.error(`Sanity fetch failed for room "${key}":`, err);
    return null;
  }
}

/** The room's lists that have at least one entry. */
export function filledGroups(room: RoomContent | null): EntryGroup[] {
  return room?.groups.filter((g) => g.entries.length > 0) ?? [];
}
