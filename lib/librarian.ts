import type { PaintingSlot } from './paintings';

/**
 * The Librarian section's content that stays in code (M1-DESIGN.md, M2):
 * name, portrait, bio, the room cards, body art and the Spotify link. The
 * rooms' lists and intros (writings, features, newsletters, bookmarks,
 * playlists) live in Sanity; see lib/sanity/content.ts.
 */

export const LIBRARIAN_NAME = 'Aditya Rajwade';

export const LIBRARIAN_PHOTO = {
  src: '/librarian/aditya-reading.jpg',
  width: 1200,
  height: 1500,
  alt: 'Aditya Rajwade reading a paperback on the grass in a park, in a pink kurta.',
};

export const LIBRARIAN_BIO = [
  'I’m Aditya Rajwade: a data analyst in Pune, co-founder of The Saturday Book Community, and the keeper of these shelves. Books define me; every one I’ve read has become a part of who I am.',
  'This side of the house holds the other things that define me (art, culture and literature): what I write, where I’ve turned up in public, what I read beyond books, the ink on my skin, and the music I’ve been banned from playing.',
];

export type Room = {
  href: string;
  title: string;
  blurb: string;
  slot: PaintingSlot;
};

export const ROOMS: Room[] = [
  {
    href: '/librarian/writings',
    title: 'Writings',
    blurb: 'Reviews, poems and city guides.',
    slot: 'librarianWritings',
  },
  {
    href: '/librarian/featured',
    title: 'Featured in',
    blurb: 'Where I’ve turned up: Instagram, YouTube, the papers.',
    slot: 'librarianFeatured',
  },
  {
    href: '/librarian/saved',
    title: 'Saved reading',
    blurb: 'Newsletters and articles worth your inbox.',
    slot: 'librarianSaved',
  },
  {
    href: '/librarian/body-art',
    title: 'Body art',
    blurb: 'Stories, inked.',
    slot: 'librarianBodyArt',
  },
  {
    href: '/librarian/music',
    title: 'Music',
    blurb: 'The playlists I’ve been banned from playing.',
    slot: 'librarianMusic',
  },
];

/* ---------- Body art and music links (the rooms’ lists and intros are in
   Sanity: lib/sanity/content.ts) ---------- */

export type Ink = { src: string; width: number; height: number; alt: string };

export const BODY_ART_INTRO = [
  'Stories have defined me my entire life, and I believe they always will. That’s why most of my body art is related to books in one way or another.',
  'I’ve long been fascinated by body art, and I want to decorate myself with the things that define me. So here are some ideas I wanted to share with you. Hopefully they inspire you too.',
];

export const FIRST_TATTOO = {
  image: {
    src: '/librarian/body-art/first-tattoo.jpg',
    width: 2434,
    height: 2594,
    alt: 'A tattoo on the leg: a stack of books wrapped in a ribbon reading “We’re all stories in the end”, with small stars around it.',
  } satisfies Ink,
  text: [
    'I’d promised myself I would get this tattoo with my first paycheck. I came across my soon-to-be tattoo artist on Instagram at just the right time and messaged her straight away. After our first conversation, I was sure I was getting this inked on my leg soon.',
    'Mannnn, I kid you not: it did hurt, but it was bearable. Whatever it was, it was worth it and more.',
  ],
  artist: { name: 'Upasana', handle: '@upasanainks', url: 'https://www.instagram.com/upasanainks/' },
  artistNote:
    'She’s not only an amazing person but a damn talented artist, with pretty good patience levels. I can’t recommend her enough!',
};

export const SECOND_TATTOO: Ink = {
  src: '/librarian/body-art/saxophone.jpg',
  width: 2296,
  height: 2823,
  alt: 'A tattoo on the leg: a saxophone player in black and grey, the bell of the saxophone filled in blue.',
};

export const DREAM_INKS_INTRO = 'Potential projects, for when I save up again.';

/** Described in words until there's an image that's mine to show. */
export const DREAM_INKS: string[] = ['A little bookshelf on the ankle.'];

export const BODY_ART_PS = 'P.S. If you have your own saved designs, do share them with me.';

export const SPOTIFY_PROFILE = 'https://open.spotify.com/user/31yndornxbj5fn6ibhzxlgmslv2y';
