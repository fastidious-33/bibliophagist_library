/**
 * Every painting on the site, in one place (M1-DESIGN.md: one public-domain
 * painting per page, with a museum-label caption).
 *
 * To hang one: put the image in public/paintings/ and fill in its slot —
 * `src` plus the label fields. A slot left as `null` shows nothing, so a
 * page never breaks for want of one; only the home page asks for an empty
 * frame ("A painting will hang here.") via <Painting emptyFrame>.
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
  /** The Librarian's Picks tab on /browse. */
  | 'browsePicks'
  /** Seen through the home page doors when they open: behind the secret
      bookcase (the Catalog) and behind the castle door (the Librarian). */
  | 'catalogDoorInside'
  | 'castleInside'
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

// All CC0 / public domain: NGA and Met open access, Art Institute of
// Chicago CC0, Nationalmuseum Stockholm public domain. Resized to ≤1600px.
export const PAINTINGS: Record<PaintingSlot, Painting | null> = {
  homeHero: {
    src: '/paintings/larsson-cosy-corner.jpg',
    width: 1600,
    height: 1088,
    title: 'Cosy Corner',
    artist: 'Carl Larsson',
    year: 'c. 1895',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Carl_Larsson-Lath%C3%B6rnet.jpg',
    alt: 'A sunlit sitting room: a striped sofa with a rug thrown over it, a chair, framed pictures on pale green panelled walls, and a dog asleep on the floor.',
  },
  browsePicks: {
    src: '/paintings/harnett-my-gems.jpg',
    width: 1210,
    height: 1600,
    title: 'My Gems',
    artist: 'William Michael Harnett',
    year: '1888',
    sourceUrl: 'https://www.nga.gov/collection/art-object-page.43680.html',
    alt: 'A still life on a dark table: worn books, sheet music, a flute, a blue and white jug, an oil lamp and a quill.',
  },
  // Behind the secret bookcase (BookshelfWall). Graded slightly lighter
  // and warmer than the source, which is very dark.
  catalogDoorInside: {
    src: '/paintings/spitzweg-bookworm.jpg',
    width: 900,
    height: 1614,
    title: 'The Bookworm (Der Bücherwurm)',
    artist: 'Carl Spitzweg',
    year: 'before 1885',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Carl_Spitzweg_Der_B%C3%BCcherwurm_537.jpg',
    alt: 'A dim, vaulted library: an old scholar in a dark coat stands high on a ladder reading, lit by a glow from the shelves, the room falling away into shadow.',
  },
  // A Gothic library behind the Gothic arch. (Until 2026-11-12 this was the
  // Thorne miniature room, now kept outside the site in
  // bibliophagist_library/prototypes/assets/thorne-french-library.jpg.)
  castleInside: {
    src: '/paintings/bennett-winchester-library.jpg',
    width: 1353,
    height: 1600,
    title: 'Library of Winchester College',
    artist: 'William Bennett',
    year: 'n.d.',
    sourceUrl: 'https://www.artic.edu/artworks/39014/library-of-winchester-college',
    alt: 'A Gothic library hall: tall bookcases line both walls under a fan-vaulted ceiling, leading to a stained-glass window.',
  },
  catalog: {
    src: '/paintings/peto-take-your-choice.jpg',
    width: 1600,
    height: 1050,
    title: 'Take Your Choice',
    artist: 'John Frederick Peto',
    year: '1885',
    sourceUrl: 'https://www.nga.gov/collection/art-object-page.126162.html',
    alt: 'A wooden crate heaped with worn, colourful books, some open and leaning, others stacked on their sides.',
  },
  genresIndex: {
    src: '/paintings/books-and-scholars-possessions.jpg',
    width: 1533,
    height: 947,
    title: 'Books and Scholars’ Possessions (four of ten panels)',
    artist: 'Unidentified artist, Korea',
    year: 'early 20th century',
    sourceUrl: 'https://www.metmuseum.org/art/collection/search/73134',
    alt: 'Four panels of a folding screen, each painted with stacked books in bright covers, vases of blossom, a clock, brushes and small cabinets.',
  },
  genreFiction: null,
  genreNonFiction: null,
  genreBoth: {
    src: '/paintings/rowlandson-bookseller-and-author.jpg',
    width: 1600,
    height: 1281,
    title: 'Bookseller and Author',
    artist: 'Thomas Rowlandson',
    year: '1784',
    sourceUrl: 'https://www.metmuseum.org/art/collection/search/392866',
    alt: 'A bookshop lined floor to ceiling with books: a stout bookseller and a thin author argue over a manuscript while a customer reads at the shelves.',
  },
  borrow: {
    src: '/paintings/peto-mug-book-biscuits.jpg',
    width: 1600,
    height: 1337,
    title: 'Mug, Book, Biscuits, and Match',
    artist: 'John Frederick Peto',
    year: '1893',
    sourceUrl: 'https://www.nga.gov/collection/art-object-page.164948.html',
    alt: 'A stoneware mug resting on a closed book, with two biscuits and a match on a wooden ledge.',
  },
  ledger: null,
  librarian: {
    src: '/paintings/corot-forest-of-fontainebleau.jpg',
    width: 1600,
    height: 524,
    title: 'Forest of Fontainebleau (detail)',
    artist: 'Jean-Baptiste-Camille Corot',
    year: '1834',
    sourceUrl: 'https://www.nga.gov/collection/art-object-page.46584.html',
    alt: 'A shaded forest pool among rocks and trees; in the foreground a young woman lies in the grass, reading.',
  },
  librarianWritings: {
    src: '/paintings/shunman-books-and-brush-stand.jpg',
    width: 1429,
    height: 1600,
    title: 'Books and Brush-Stand',
    artist: 'Kubo Shunman',
    year: '19th century',
    sourceUrl: 'https://www.metmuseum.org/art/collection/search/54716',
    alt: 'Two books, one open on white characters on black, beside a jar of writing brushes, a small water-dropper and fallen cherry blossoms, with poems written above.',
  },
  librarianFeatured: {
    src: '/paintings/cezanne-artists-father-reading.jpg',
    width: 949,
    height: 1600,
    title: 'The Artist’s Father, Reading “L’Événement”',
    artist: 'Paul Cezanne',
    year: '1866',
    sourceUrl: 'https://www.nga.gov/collection/art-object-page.52085.html',
    alt: 'An old man in a cap sits in a large patterned armchair, reading a newspaper held open in front of him.',
  },
  librarianSaved: {
    src: '/paintings/peto-blue-envelope.jpg',
    width: 1600,
    height: 1000,
    title: 'The Blue Envelope',
    artist: 'John Frederick Peto',
    year: 'c. 1890s',
    sourceUrl: 'https://www.nga.gov/collection/art-object-page.110278.html',
    alt: 'An old leather-bound book with a blue envelope and a quill pen tucked under a small round box.',
  },
  librarianBodyArt: {
    src: '/paintings/kunisada-tattooed-priest.jpg',
    width: 1104,
    height: 1600,
    title: 'Nakamura Fukusuke I as Asahina Tōbei, likened to Lu Zhishen the Tattooed Priest',
    artist: 'Utagawa Kunisada',
    year: '1854',
    sourceUrl: 'https://www.metmuseum.org/art/collection/search/55528',
    alt: 'A kabuki actor as a fierce hero, his arms and chest covered in tattoos of red flowers and waves.',
  },
  librarianMusic: {
    src: '/paintings/harnett-old-violin.jpg',
    width: 1005,
    height: 1600,
    title: 'The Old Violin',
    artist: 'William Michael Harnett',
    year: '1886',
    sourceUrl: 'https://www.nga.gov/collection/art-object-page.79531.html',
    alt: 'A violin and bow hanging on a green door with iron hinges, with a sheet of music behind it and a small card pinned below.',
  },
};
