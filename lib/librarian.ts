import type { PaintingSlot } from './paintings';

/**
 * The Librarian section's content (M1-DESIGN.md). Hardcoded for M1, kept in
 * this one file so M2 can move it to Sanity in one go.
 */

export const LIBRARIAN_NAME = 'Aditya Rajwade';

export const LIBRARIAN_PHOTO = {
  src: '/librarian/aditya-rajwade.jpeg',
  width: 2448,
  height: 2710,
  alt: 'Aditya Rajwade',
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

/* ---------- The rooms' content (from the Super site, lightly tidied) ---------- */

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

export type EntryGroup = { heading: string; entries: Entry[] };

const MY_SUBSTACK = 'A Bibliophagist (Substack)';
const TSBC_SUBSTACK = 'The Saturday Book Community (Substack)';

export const WRITINGS_INTRO = [
  'I haven’t written a lot. I keep a diary, but only some of it makes it to the page.',
];

export const WRITINGS: EntryGroup[] = [
  {
    heading: 'Book reviews',
    entries: [
      {
        title: 'Djinn City: A haphazard review',
        url: 'https://abibliophagist.substack.com/p/djinn-city-a-haphazard-review',
        source: MY_SUBSTACK,
        blurb: 'This will be my first time writing a comprehensive review.',
      },
    ],
  },
  {
    heading: 'Poetry & short stories',
    entries: [
      {
        title: 'A Whisper to Share',
        url: 'https://abibliophagist.substack.com/p/a-whisper-to-share',
        source: MY_SUBSTACK,
        blurb: 'I have written some pieces, which are a part of my internal monologue.',
      },
    ],
  },
  {
    heading: 'City guides',
    entries: [
      {
        title: 'Exploring Goa’s Literary Scene',
        url: 'https://thesaturdaybookcommunity.substack.com/p/exploring-goas-literary-scene',
        source: `Goa · ${TSBC_SUBSTACK}`,
        blurb: 'A guide to bookstores and book communities in the state.',
      },
      {
        title: 'Exploring Pune’s Cultural Scene: A Guide to Art Galleries and Museums in the City',
        url: 'https://thesaturdaybookcommunity.substack.com/p/exploring-pune-s-cultural-scene-a-guide-to-art-galleries-and-museums-in-the-city',
        source: `Pune · ${TSBC_SUBSTACK}`,
        blurb:
          'I have always liked recommending different experiences to friends and acquaintances, but my reach is limited.',
      },
      {
        title: 'Exploring Pune’s Bookstore and Book Community Scene: A Comprehensive Guide',
        url: 'https://thesaturdaybookcommunity.substack.com/p/bookstores-in-pune',
        source: `Pune · ${TSBC_SUBSTACK}`,
        blurb: 'Shifting to a new city can be daunting.',
      },
    ],
  },
];

export const FEATURED_INTRO = [
  'Since starting and joining different reading initiatives, I’ve turned up in a few articles and sites. Some only show my picture, but it’s all in the public domain, so do look it up.',
];

export const FEATURED: EntryGroup[] = [
  {
    heading: 'On Instagram',
    entries: [
      {
        title: 'International Museum Day: Pune’s bookish finds',
        url: 'https://www.instagram.com/p/C7GcU5WIpdb/',
        source: 'LBB Pune',
        date: '2024-05-18',
      },
      {
        title: 'A thank-you for rebuilding SABIA’s Pune community',
        url: 'https://www.instagram.com/reel/DFIH3pAivge/',
        source: 'Share A Book India Association',
        date: '2025-01-22',
      },
      {
        title: 'Putting faces to the community: meet the admins',
        url: 'https://www.instagram.com/p/C6lkbQlrnNx/',
        source: 'The Saturday Book Community',
        date: '2024-05-05',
      },
    ],
  },
  {
    heading: 'On YouTube',
    entries: [
      {
        title: 'Data analyst and co-founder of The Saturday Book Community Aditya speaks about books!',
        url: 'https://youtu.be/nYHyJ0R1ado',
        source: 'YouTube',
      },
    ],
  },
  {
    heading: 'In the news',
    entries: [
      {
        title: 'An afternoon of literary escapes',
        url: 'https://timesofindia.indiatimes.com/entertainment/events/pune/an-afternoon-of-literary-escapes/articleshow/111163755.cms',
        source: 'Times of India',
      },
      {
        title: 'Reading clubs become literary havens for city bibliophiles',
        url: 'https://timesofindia.indiatimes.com/city/pune/reading-clubs-become-literary-havens-for-city-bibliophiles/articleshow/107293468.cms',
        source: 'Times of India',
      },
      {
        title: 'Pune reviving reading culture. Not libraries or cafes but park is the new book club',
        url: 'https://theprint.in/ground-reports/pune-reviving-reading-culture-not-libraries-or-cafes-but-park-is-the-new-book-club/1629273/',
        source: 'ThePrint',
      },
    ],
  },
];

export const SAVED_INTRO = [
  'As you can tell from this site, I read a lot: books, magazines, articles, essays, poems, anything that interests me, enriches me and makes me think. So I don’t make recommendations lightly. I’ve either read these myself or heard genuinely good things about them.',
  'Read them, use them, and send me more interesting articles and newsletters.',
];

export const SAVED_PS =
  'P.S. I subscribe to all of these from a separate email account, which keeps them apart from my main inbox. I also have an extra account that only follows all things art, culture and literature. I’d genuinely suggest you do the same.';

export const NEWSLETTERS: EntryGroup[] = [
  {
    heading: 'Independent newsletters',
    entries: [
      { title: 'The Paris Review', url: 'https://www.theparisreview.org/' },
      { title: 'TheCollector', url: 'https://www.thecollector.com/' },
      { title: 'Aeon', url: 'https://aeon.co/' },
      { title: 'The Marginalian', url: 'https://www.themarginalian.org/', source: 'Maria Popova' },
      { title: 'Granta', url: 'https://granta.com/' },
      { title: 'The Chitthi', url: 'https://mailchi.mp/mad-over-marketing.com/chitthi', source: 'Mad Over Marketing' },
      { title: 'Condé Nast Traveler', url: 'https://www.cntraveler.com/' },
      { title: 'Get Goalside', url: 'https://get-goalside-newsletter-archive.beehiiv.com/' },
    ],
  },
  {
    heading: 'Newsletters on Substack',
    entries: [
      { title: 'A Bibliophagist', url: 'https://abibliophagist.substack.com/', source: 'Aditya Rajwade (mine)' },
      { title: 'The Alipore Post', url: 'https://thealiporepost.substack.com/' },
      { title: 'Crow & Colophon', url: 'https://tblm.substack.com/', source: 'TBLM' },
      { title: 'CultureCafe', url: 'https://www.theculturecafe.in/', source: 'Anurag Minus Verma' },
      { title: 'Looking Through the Past', url: 'https://worldhistory.substack.com/', source: 'George Dillard' },
      { title: 'Mumbai Paused', url: 'https://mumbaipaused.substack.com/' },
      { title: 'Readers of 42 Public Library', url: 'https://readersof42.substack.com/', source: 'Nitin Goel' },
      { title: 'A Little Bit of B.S.', url: 'https://broadeningsensibilities.substack.com/', source: 'Broadening Sensibilities' },
      { title: 'Thomas Ong', url: 'https://substack.com/@notaloneclub' },
      { title: 'Zoe Sees', url: 'https://zoesi.substack.com/', source: 'Zoe Si' },
      { title: 'Green Humour', url: 'https://greenhumour.substack.com/' },
      { title: 'Dracula Daily', url: 'https://draculadaily.substack.com/' },
      { title: 'Whatever Happened to Fiction?', url: 'https://whateverhappenedtofiction.substack.com/', source: 'Prathamesh Yemul' },
    ],
  },
];

export const BOOKMARKS_INTRO =
  'Articles I’ve bookmarked over the years, sorted by topic, because I want to share them with everyone.';

/** Topics only for now; the bookmarks themselves move over from Notion in M2. */
export const BOOKMARK_TOPICS: { id: string; title: string; entries: Entry[] }[] = [
  { id: 'history-politics-culture-society', title: 'History, politics, culture & society', entries: [] },
  { id: 'environment', title: 'Environment', entries: [] },
  { id: 'education', title: 'Education', entries: [] },
  { id: 'helpful-sites', title: 'Helpful sites', entries: [] },
  { id: 'thought-provoking-articles', title: 'Thought-provoking articles', entries: [] },
  { id: 'book-recommendations', title: 'Book recommendations', entries: [] },
  { id: 'bookstores-communities', title: 'Bookstores & book communities', entries: [] },
];

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

export const MUSIC_INTRO = [
  'I listen to a lot of music, with a lot of variety. I’ve often been banned from playing my playlists, but I don’t care: I like them a lot, and I’ve curated them carefully.',
];

export const SPOTIFY_PROFILE = 'https://open.spotify.com/user/31yndornxbj5fn6ibhzxlgmslv2y';

export const PLAYLISTS: Entry[] = [
  {
    title: 'Jazz mixtape',
    url: 'https://open.spotify.com/playlist/7lCZ4Hu2zloeqxw6ffEEtB',
    blurb: 'The gramophone in the corner of the reading room.',
  },
  {
    title: 'Indie India',
    url: 'https://open.spotify.com/playlist/4sCdpUHtnyV8tYpAQIvvad',
    blurb: 'Independent artists from home.',
  },
  {
    title: 'Rap out',
    url: 'https://open.spotify.com/playlist/5wv7IoXZG8QowzEyRGhxhw',
    blurb: 'For when the reading’s done.',
  },
];
