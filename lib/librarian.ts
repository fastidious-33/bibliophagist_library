import type { PaintingSlot } from './paintings';

/**
 * The Librarian section's content (M1-DESIGN.md). Hardcoded for M1, kept in
 * this one file so M2 can move it to Sanity in one go.
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

/**
 * The bookmarks, brought over from the Super site's seven reading lists
 * (2026-11-13), in Super's order. Cleaned on the way: Google AMP cache
 * links swapped for the original articles, tracking tags (fbclid, utm_*)
 * stripped, site-name suffixes trimmed from titles, missing titles written
 * from the article's own address. Left out: a shadow-library link, a
 * private Runway dashboard, and LEDeG (its domain now redirects to a
 * casino site). Protoprint and Drive & Listen point to where those
 * projects live now. M2 moves these into Sanity in the same shape.
 */
export const BOOKMARK_TOPICS: { id: string; title: string; entries: Entry[] }[] = [
  {
    id: 'history-politics-culture-society',
    title: 'History, politics, culture & society',
    entries: [
      { title: 'Indian history, Indian art, facts of India', url: 'https://www.livehistoryindia.com/', source: 'Peepul Tree Stories' },
      { title: 'What Erwin Schrödinger Said About the Upanishads', url: 'https://science.thewire.in/the-sciences/erwin-schrodinger-quantum-mechanics-philosophy-of-physics-upanishads/', source: 'Viraj Kulkarni, The Wire Science' },
      { title: 'The Genius of Vedic Math and how it was erased from the lives of Indians', url: 'https://tfipost.com/2021/12/the-genius-of-vedic-math-and-how-it-was-erased-from-the-lives-of-indians/', source: 'Akshay Narang, TFIPost' },
      { title: '7 Reasons Why Constantinople Was So Important', url: 'https://www.thecollector.com/why-was-constantinople-important/', source: 'Dušan Nikolić, TheCollector' },
      { title: 'The Indians Who Pulled Off the ‘Greatest Daylight Robbery’ That Shook the British Raj', url: 'https://www.thebetterindia.com/261666/rodda-arms-heist-history-british-raj-rebellion-kakori-train-robbery/', source: 'The Better India' },
      { title: 'The forgotten story of … Carlos Kaiser, football’s greatest conman', url: 'https://www.theguardian.com/football/blog/2017/apr/26/the-forgotten-story-of-carlos-kaiser-footballs-greatest-conman', source: 'Rob Smyth, The Guardian' },
      { title: '‘Portuguese were culinary imperialists in Goa’', url: 'https://www.gomantaktimes.com/my-goa/art-culture/portuguese-were-culinary-imperialists-in-goa', source: 'Gomantak Times' },
      { title: 'Inca Medicine: Religion, Culture, and Ethnobotany', url: 'https://central.edu/writing-anthology/2019/05/29/inca-medicine-religion-culture-and-ethnobotany/', source: 'Synaptic, Central College' },
      { title: 'The killing of Gauri Lankesh', url: 'https://www.cjr.org/special_report/gauri-lankesh-killing.php', source: 'Columbia Journalism Review' },
      { title: '‘If we want to reduce violence in this country, we need to change how power works’: Revati Laul', url: 'https://scroll.in/article/918259/if-we-want-to-reduce-violence-in-this-country-we-need-to-change-how-power-works-revati-laul', source: 'Urvashi Bahuguna, Scroll' },
      { title: 'How we misread the numbers that dominate our politics', url: 'https://www.washingtonpost.com/opinions/on-the-economy-the-campaigns-say-only-some-numbers-count/2012/10/19/e32d9b70-1936-11e2-aa6f-3b636fecb829_story.html', source: 'Zachary A. Goldfarb, The Washington Post' },
      { title: 'Statistics Don’t Lie; People Do: The Science of Political Polling', url: 'https://ivn.us/2014/01/08/statistics-dont-lie-people-science-political-polling/', source: 'Independent Voter News' },
      { title: 'Outnumbered by David Sumpter — can data science really sway polls?', url: 'https://www.ft.com/content/d8fd1eee-5d98-11e8-9334-2218e7146b04', source: 'Financial Times' },
      { title: 'How Do You Live With The Guilt Of Committing A Heinous Crime? A New Book Attempts To Find Out', url: 'https://m.huffingtonpost.in/2018/12/13/writing-a-book-on-the-gujarat-riots-taught-me-hate-can-be-rejected-says-revati-laul_a_23616959/', source: 'Aman Sethi, HuffPost India' },
      { title: 'History is our legacy, can’t allow politicians to fritter it away', url: 'https://www.newindianexpress.com/opinions/2020/oct/10/history-is-our-legacy-cant-allow-politicians-to-fritter-it-away-2208344.html', source: 'Nanditha Krishna, The New Indian Express' },
      { title: 'Indian legal news, court cases and law firm updates', url: 'https://www.barandbench.com/', source: 'Bar and Bench' },
      { title: '‘We’ve Seen This Before’: Margaret Atwood on ‘The Handmaid’s Tale’ and How History Repeats Itself', url: 'https://www.rollingstone.com/tv/tv-features/margaret-atwood-interview-season-4-handmaids-tale-1171567/', source: 'Rolling Stone' },
      { title: 'India’s Leading Documentary Filmmaker Has a Warning', url: 'https://www.nytimes.com/2020/12/01/magazine/india-documentary-anand-patwardhan.html', source: 'Abhrajyoti Chakraborty, The New York Times' },
      { title: 'Don’t trust Muslims, leftists or secularists: Why The Kashmir Files is no Schindler’s List', url: 'https://www.newslaundry.com/2022/03/15/dont-trust-muslims-leftists-or-secularists-why-the-kashmir-files-is-no-schindlers-list', source: 'Asim Ali, Newslaundry' },
      { title: 'U Tirot Singh & Meghalaya’s Fight For Freedom', url: 'https://www.livehistoryindia.com/story/history-daily/u-tirot-singh-meghalayas-fight-for-freedom/', source: 'Mahasweta Dey, Live History India' },
      { title: 'Go Ahead and Ban My Book', url: 'https://www.theatlantic.com/ideas/archive/2023/02/margaret-atwood-handmaids-tale-virginia-book-ban-library-removal/673013/', source: 'Margaret Atwood, The Atlantic' },
      { title: 'Just how meaningful is coincidence, beyond the statistics?', url: 'https://aeon.co/essays/just-how-meaningful-is-coincidence-beyond-the-statistics', source: 'Aeon' },
      { title: 'Belonging among the beasts and the gods in Mayan cosmology', url: 'https://aeon.co/essays/belonging-among-the-beasts-and-the-gods-in-mayan-cosmology', source: 'Aeon' },
      { title: 'Lawmetree', url: 'https://lawmetree.com/' },
      { title: 'IYKYK, a solo show by Smishdesigns, unravels the artist’s political musings', url: 'https://www.architecturaldigest.in/story/iykyk-a-solo-show-by-smishdesigns-unravels-the-artists-political-musings/', source: 'Megha Kapoor, Architectural Digest India' },
      { title: 'Meet the Artist Keeping the Naga Tattoo Heritage of Northeast India Alive', url: 'https://www.afar.com/magazine/tattoo-artist-mo-naga-keeps-naga-tattoo-traditions-alive', source: 'AFAR' },
      { title: 'Roadbook', url: 'https://roadbook.com/' },
      { title: 'This brand-new gallery at CSMVS is a tribute to Mumbai and its people', url: 'https://www.cntraveller.in/story/this-brand-new-gallery-at-csmvs-is-a-tribute-to-mumbai-and-its-people/', source: 'Riddhi Doshi, Condé Nast Traveller India' },
      { title: 'In this Himachal village, Kahani ki Dukaan is helping children express themselves through stories', url: 'https://www.cntraveller.in/story/gunehar-himachal-pradesh-village-kahani-ki-dukaan/', source: 'Avantika Chaturvedi, Condé Nast Traveller India' },
      { title: 'These next-generation chefs are shining a spotlight on Naga cuisine', url: 'https://www.cntraveller.in/story/these-next-generation-chefs-are-shining-a-spotlight-on-naga-cuisine/', source: 'Rituparna Roy, Condé Nast Traveller India' },
    ],
  },
  {
    id: 'environment',
    title: 'Environment',
    entries: [
      { title: 'How the Dragonfly’s Surprisingly Complex Brain Makes It a Deadly Hunter', url: 'https://gizmodo.com/how-the-dragonfly-s-surprisingly-complex-brain-makes-it-1797225846', source: 'Casey Chan, Gizmodo' },
      { title: 'Measuring light pollution', url: 'https://www.darksky.org/light-pollution/measuring-light-pollution/', source: 'DarkSky International' },
      { title: 'Buzz of hope: after numerous tiger encounters, the traditional honey gatherers of the Sundarbans get a new lease of life', url: 'https://en.gaonconnection.com/buzz-of-hope-after-numerous-tiger-encounters-traditional-honey-gatherers-of-the-sundarbans-get-a-new-lease-of-life/', source: 'Gaon Connection' },
      { title: 'Why Thousands of Chhattisgarh Adivasis Protested This Forest Officer’s Transfer', url: 'https://www.thebetterindia.com/245586/ifs-hero-chhattisgarh-adivasi-dfo-ganveer-dhammshil-transfer-tribal-community-protest-forest-officer-nor41/', source: 'Rinchen Norbu Wangchuk, The Better India' },
      { title: '‘A double-edged sword’: Mumbai pollution ‘perfect’ for flamingos', url: 'https://www.theguardian.com/cities/2019/mar/26/a-double-edged-sword-mumbai-pollution-perfect-for-flamingos', source: 'Payal Mohta, The Guardian' },
      { title: 'Training and conferences', url: 'https://www.bats.org.uk/our-work/training-and-conferences', source: 'Bat Conservation Trust' },
      { title: 'When the Sea Rises: A Story from the Indian Sundarbans', url: 'https://science.thewire.in/environment/sundarbans-sea-rise-sagar-island-inhabitants-land-livelihood-social-isolation/', source: 'Sharanya Chattopadhyay, The Wire Science' },
      { title: 'Pleasing the tiger-seeking tourist is tough, says Ranthambore’s first woman guide', url: 'https://www.cntraveller.in/story/ranthambore-tiger-guide-first-woman-rajasthan/', source: 'Suprita Mitter, Condé Nast Traveller India' },
      { title: 'Nomads of the Himalayas: A Fascinating Glimpse into the Rarely-Seen Forest World of the Van Gujjars', url: 'https://www.thebetterindia.com/67099/van-gujjars-himalayas-tribe-buffaloes/', source: 'Sanchari Pal, The Better India' },
      { title: 'Cats in the City: Why leopard attacks are not rare in Mumbai', url: 'https://www.firstpost.com/explainers/explained-why-leopard-attacks-are-not-rare-in-mumbai-11689441.html', source: 'Firstpost' },
      { title: 'The joy and tragedies of River Luni', url: 'https://veditum.org/2024/07/11/the-joy-and-tragedies-of-river-luni-samdhari-pichiyak/', source: 'Moving Upstream, Veditum' },
      { title: 'Rooted in tradition, nature-based architecture bridges generations', url: 'https://india.mongabay.com/2024/11/rooted-in-tradition-nature-based-architecture-bridges-generations/', source: 'Arathi Menon, Mongabay India' },
      { title: 'The Protoprint Project: empowering urban waste pickers', url: 'https://www.protoprint.in/', source: 'Protoprint Initiative' },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    entries: [
      { title: 'Mushrooms & moss: All students should be taught science like in this Uttarakhand village', url: 'https://theprint.in/pageturner/excerpt/mushrooms-moss-students-should-be-taught-science-like-this-uttarakhand-village/353552/', source: 'S. Giridhar, ThePrint' },
      { title: 'What’s wrong with the Indian education system?', url: 'https://medium.com/@kurianbenoy1998/whats-wrong-with-indian-education-system-30165056dc49', source: 'Kurian Benoy' },
      { title: 'Our solutions for education aren’t working. Here’s why.', url: 'https://idronline.org/solutions-for-education-are-not-working-heres-why/', source: 'Devanshi Vaid, India Development Review' },
      { title: 'We need fewer exams and more wilderness in education', url: 'https://www.theguardian.com/teacher-network/2015/dec/17/we-need-fewer-exams-and-more-wilderness-in-education', source: 'The Guardian' },
      { title: 'ELI practitioner briefs', url: 'http://eli.tiss.edu/handouts-publications/', source: 'Early Literacy Initiative, TISS' },
      { title: 'Education', url: 'https://idronline.org/sectors/education/', source: 'India Development Review' },
      { title: 'Teachers Are Sharing Experiences They Had With A Student That Caused Them To Change How They Conduct Their Class', url: 'https://www.buzzfeed.com/victoriavouloumanos/teachers-share-experience-that-made-them-change-teaching', source: 'Victoria Vouloumanos, BuzzFeed' },
      { title: 'This Chota Nagpuri Graphic Novel Will Change The Way You Think About Education', url: 'https://thethirdeyeportal.in/body/nagpuri-graphic-novel-will-change-the-way-you-think-about-education/', source: 'Suman Parmar, The Third Eye' },
      { title: 'Digital library of illustrated storybooks in 300+ languages', url: 'https://storyweaver.org.in/en', source: 'StoryWeaver' },
      { title: 'Teaching at the Right Level', url: 'https://www.pratham.org/about/teaching-at-the-right-level/', source: 'Pratham' },
      { title: 'Kalpavriksh', url: 'https://kalpavriksh.org/' },
    ],
  },
  {
    id: 'helpful-sites',
    title: 'Helpful sites',
    entries: [
      { title: 'Recommend Me a Book', url: 'https://recommendmeabook.com/' },
      { title: 'Whichbook', url: 'https://www.whichbook.net/mood-emotion/1-3/4-7/10-6/', blurb: 'Books by mood: fairly happy, fairly unpredictable, a little unusual.' },
      { title: 'The Art of Curating the Perfect Home Library', url: 'https://www.insidehook.com/books/curating-the-perfect-home-library-nina-freudenberger', source: 'Rachel Vorona Cote, InsideHook' },
      { title: 'Floor-to-ceiling bookshelves ideas', url: 'https://nextluxury.com/home-design/floor-to-ceiling-bookshelves-ideas/', source: 'Next Luxury' },
      { title: 'Literary clock', url: 'https://www.ticktockquotes.com/' },
      { title: 'Literature Clock', url: 'https://literature-clock.jenevoldsen.com/' },
      { title: 'Sync highlights from Kindle', url: 'https://www.notion.com/templates/sync-from-kindle', source: 'Notion template' },
      { title: 'Drive & Listen', url: 'https://drivefromhome.com/', blurb: 'Now called Drive From Home.' },
    ],
  },
  {
    id: 'thought-provoking-articles',
    title: 'Thought-provoking articles',
    entries: [
      { title: 'Indian Adults Are Leading ‘Double Lives’ to Avoid Controlling Parents. But What’s the Hidden Cost?', url: 'https://www.theswaddle.com/indian-adults-are-leading-double-lives-to-avoid-controlling-parents-but-whats-the-hidden-cost', source: 'The Swaddle' },
      { title: 'Kafka’s Remarkable Letter to His Abusive and Narcissistic Father', url: 'https://www.themarginalian.org/2015/03/05/franz-kafka-letter-father/', source: 'Maria Popova, The Marginalian' },
      { title: 'Kafka on Friendship and the Art of Reconnection', url: 'https://www.themarginalian.org/2024/11/17/kafka-on-friendship/', source: 'Maria Popova, The Marginalian' },
      { title: 'How Hind Pocket Books brought a ‘paperback revolution’ in Hindi publishing', url: 'https://theprint.in/pageturner/excerpt/hind-pocket-books-paperback-revolution-hindi-publishing/2369116/', source: 'Aakriti Mandhwani, ThePrint' },
      { title: 'Auden on Writing, Originality, Self-Criticism, and How to Be a Good Reader', url: 'https://www.themarginalian.org/2016/08/10/auden-dyers-hand-reading-writing/', source: 'Maria Popova, The Marginalian' },
      { title: 'Books and articles', url: 'https://centreforcontemporaryfolklore.org/books-and-online-archives/', source: 'Centre for Contemporary Folklore' },
      { title: 'The curious case of the short story in India', url: 'https://www.thehindu.com/books/short-story-writing-india-publishing-landscape-anthologies-authors-publishers-weigh-in/article68255224.ece', source: 'Swati Daftuar, The Hindu' },
      { title: 'The Art of Looking: Eleven Ways of Viewing the Multiple Realities of Our Everyday Wonderland', url: 'https://www.themarginalian.org/2013/08/12/on-looking-eleven-walks-with-expert-eyes/', source: 'Maria Popova, The Marginalian' },
      { title: 'Boyish', url: 'https://boyish.in/', source: 'Rajat Mittal' },
      { title: 'The official copy of the Indian Constitution was not written on just any piece of paper', url: 'https://scroll.in/article/951066/the-official-copy-of-the-indian-constitution-was-not-written-on-just-any-piece-of-paper', source: 'Shruti Chakraborty, Sahapedia' },
      { title: 'Neil Gaiman’s Dream Journal: Nightmares and Fantasies That Shaped His Stories', url: 'https://www.timesnownews.com/lifestyle/books/features/neil-gaimans-dream-journal-nightmares-and-fantasies-that-shaped-his-stories-article-111406518', source: 'Times Now' },
      { title: 'Can We Please Put an End to Overperformed Audiobooks?', url: 'https://lithub.com/can-we-please-put-an-end-to-overperformed-audibooks/', source: 'Maris Kreizman, Literary Hub' },
      { title: 'Virginia Woolf: “How Should One Read a Book?”', url: 'https://yalereview.org/article/virginia-woolf-essay-how-should-read-book', source: 'The Yale Review' },
      { title: 'Iceland’s Christmas Book Flood Is a Force of Nature', url: 'https://www.smithsonianmag.com/travel/icelands-christmas-book-flood-is-a-force-of-nature-180981293/', source: 'Lauren Oster, Smithsonian' },
      { title: '‘Dead Poets Society’ Is a Terrible Defense of the Humanities', url: 'https://www.theatlantic.com/education/archive/2014/02/-em-dead-poets-society-em-is-a-terrible-defense-of-the-humanities/283853/', source: 'Kevin Dettmar, The Atlantic' },
      { title: 'The Night Circus', url: 'https://www.halthegal.art/night-circus', source: 'halthegal' },
      { title: 'Lost in Translation: An Illustrated Catalog of Beautiful Untranslatable Words from Around the World', url: 'https://www.themarginalian.org/2014/11/24/lost-in-translation-ella-frances-sanders/', source: 'Maria Popova, The Marginalian' },
      { title: 'How to nurture a personal library', url: 'https://psyche.co/guides/how-to-nurture-and-grow-a-personal-library-of-books', source: 'Psyche' },
      { title: 'Can Reading Fiction Early in Life Make People More Empathetic?', url: 'https://theswaddle.com/can-reading-fiction-early-in-life-make-people-more-empathetic/', source: 'The Swaddle' },
      { title: 'Just say no (to content): Nietzsche’s surprising “information diet”', url: 'https://arstechnica.com/staff/2022/05/just-say-no-to-content-nietzsches-surprising-information-diet/', source: 'Nate Anderson, Ars Technica' },
      { title: 'Reading, a ‘minority past time’, says Ruskin Bond', url: 'https://www.telegraphindia.com/culture/books/reading-a-minority-past-time-says-ruskin-bond/cid/1825940', source: 'Shrestha Saha, The Telegraph' },
      { title: 'What the way you arrange your bookshelves says about you', url: 'https://www.penguin.co.uk/articles/2020/jan/how-to-rearrange-your-bookshelf.html', source: 'Penguin' },
      { title: 'Umberto Eco’s Antilibrary: Why Unread Books Are More Valuable to Our Lives than Read Ones', url: 'https://www.themarginalian.org/2015/03/24/umberto-eco-antilibrary/', source: 'Maria Popova, The Marginalian' },
      { title: 'Ella Berthoud', url: 'http://www.ellaberthoud.com/' },
      { title: 'Can Reading Make You Happier?', url: 'https://www.newyorker.com/culture/cultural-comment/can-reading-make-you-happier', source: 'Ceridwen Dovey, The New Yorker' },
      { title: 'Our fiction addiction: Why humans need stories', url: 'https://www.bbc.com/culture/article/20180503-our-fiction-addiction-why-humans-need-stories', source: 'BBC Culture' },
      { title: 'Why do we love stories?', url: 'https://www.visualstorytell.com/blog/why-do-we-love-stories', source: 'Shlomi Ron' },
      { title: 'It’s Time for Men to Start Reading More Erotica', url: 'https://www.insidehook.com/article/sex-and-dating/time-men-start-reading-more-erotica', source: 'Kayla Kibbe, InsideHook' },
      { title: 'The man who wrote the most perfect sentences ever written', url: 'https://www.bbc.com/culture/article/20200602-the-man-who-wrote-the-most-perfect-sentences-ever-written', source: 'Nicholas Barber, BBC Culture' },
      { title: 'The Best Summary of How to Read a Book by Mortimer Adler', url: 'https://fs.blog/how-to-read-a-book/', source: 'Farnam Street' },
      { title: 'Pulaprem पु.ल.प्रेम', url: 'https://cooldeepak.blogspot.com/' },
      { title: 'Tsundoku: The art of buying books and never reading them', url: 'https://www.bbc.com/news/world-44981013', source: 'BBC News' },
      { title: 'Lucas and Spielberg on the future of entertainment', url: 'https://variety.com/2013/digital/news/lucas-spielberg-on-future-of-entertainment-1200496241/', source: 'Variety' },
      { title: 'This Is What a Great Book Does to Your Brain', url: 'https://www.inc.com/jessica-stillman/this-is-what-a-great-book-does-to-your-brain.html', source: 'Jessica Stillman, Inc.' },
      { title: 'How to Read Fewer Books', url: 'https://www.theschooloflife.com/thebookoflife/how-to-read-fewer-books/', source: 'The School of Life' },
      { title: 'The Letterboxd Page That Became Something Much More', url: 'https://www.indiewire.com/features/interviews/letterboxd-page-paint-drying-1234954531/', source: 'Josh Bell, IndieWire' },
      { title: 'Why A.I. Isn’t Going to Make Art', url: 'https://www.newyorker.com/culture/the-weekend-essay/why-ai-isnt-going-to-make-art', source: 'Ted Chiang, The New Yorker' },
      { title: 'Eating the Sun: A Lovely Illustrated Celebration of Wonder, the Science of How the Universe Works, and the Existential Mystery of Being Human', url: 'https://www.themarginalian.org/2019/08/12/eating-the-sun-ella-frances-sanders/', source: 'Maria Popova, The Marginalian' },
      { title: 'The Gifted Listener: Composer Aaron Copland on Honing Your Talent for Listening to Music', url: 'https://www.themarginalian.org/2021/09/17/the-gifted-listener-aaron-copland/', source: 'Maria Popova, The Marginalian' },
      { title: '“We make music so that there are a little less of untold stories in the world”: in conversation with Chizai', url: 'https://theindianmusicdiaries.com/we-make-music-so-that-there-are-a-little-less-of-untold-stories-in-the-world-in-conversation-with-chizai/', source: 'Kusumitha Vasanth, The Indian Music Diaries' },
      { title: 'These shocking stories explain why Spain’s women’s team want systemic…', url: 'https://archive.ph/grTqB', source: 'archived article' },
      { title: 'The Truelove: Poet and Philosopher David Whyte on Reaching Beyond Our Limiting Beliefs About the Love We Deserve', url: 'https://www.themarginalian.org/2021/07/26/david-whyte-the-truelove/', source: 'Maria Popova, The Marginalian' },
      { title: 'There is a worrying amount of fraud in medical research', url: 'https://archive.ph/p6eu9', source: 'The Economist (archived)' },
      { title: 'Ambient television: why streaming services are focusing on the background', url: 'https://warwickboar.shorthandstories.com/ambient-television--why-streaming-services-are-focusing-on-the-background/index.html', source: 'The Boar' },
      { title: 'Clock Blocked: How Time Became An Avenue Of Resistance In Colonial Bombay', url: 'https://homegrown.co.in/homegrown-voices/clock-blocked-how-time-became-an-avenue-of-resistance-in-colonial-bombay', source: 'Anahita Ahluwalia, Homegrown' },
      { title: '‘Book fair promoting sub-standard literature than habit of reading’', url: 'https://www.thehindu.com/news/cities/kolkata/book-fair-promoting-sub-standard-literature-than-habit-of-reading/article69187390.ece', source: 'Bishwanath Ghosh, The Hindu' },
    ],
  },
  {
    id: 'book-recommendations',
    title: 'Book recommendations',
    entries: [
      { title: '10 Must-Read Books for History Lovers, Recommended by Manu Pillai', url: 'https://www.thebetterindia.com/295665/manu-s-pillai-recommends-10-history-books-for-your-next-read/', source: 'Sowmya Mani, The Better India' },
      { title: 'Your Guides to the World of Fairies and to the Multiverse', url: 'https://www.nytimes.com/2023/04/14/books/review/science-fiction-fantasy-books-fawcett-utomi-carey.html', source: 'Amal El-Mohtar, The New York Times' },
      { title: '6 Magical Realists to Read after Borges', url: 'https://www.thecollector.com/magical-realist-after-borges/', source: 'Catherine Dent, TheCollector' },
      { title: 'The Most Iconic Speculative Fiction Books of the 21st Century', url: 'https://reactormag.com/the-most-iconic-speculative-fiction-books-of-the-21st-century/', source: 'Christina Orlando, Reactor' },
      { title: 'Suddenly Many New Fictional Detectives Are Sniffing for Clues on the Streets of Bombay', url: 'https://m.thewire.in/article/books/bombay-mumbai-detective-fiction', source: 'Sidharth Bhatia, The Wire' },
      { title: '15 Indian Women Short Story Writers You Should Read', url: 'https://www.shethepeople.tv/home-top-video/indian-short-story-writers-women/', source: 'Deepshikha Chakravarti, SheThePeople' },
      { title: '5 Translated Pieces of Bengali Literature You Must Taste', url: 'https://baos.pub/5-translated-pieces-of-bengali-literature-you-must-taste-55922298b310', source: 'Anirban Kar' },
      { title: 'The Best Mythopoeic Fantasy, recommended by Samantha Shannon', url: 'https://fivebooks.com/best-books/the-best-mythopoeic-fantasy-samantha-shannon/', source: 'Five Books' },
      { title: 'YA fantasy novels', url: 'https://www.thecuriousreader.in/bookrack/ya-fantasy-novels/', source: 'The Curious Reader' },
      { title: 'Five Books With Fantasy Worlds Inspired by India', url: 'https://www.tor.com/2020/06/24/five-book-with-fantasy-worlds-inspired-by-india/', source: 'Christina Orlando, Reactor' },
      { title: 'Lightspeed Magazine', url: 'https://www.lightspeedmagazine.com/about/' },
    ],
  },
  {
    id: 'bookstores-communities',
    title: 'Bookstores & book communities',
    entries: [
      { title: 'As Urdu Bazaar fades away, bookshop owners mourn the slow decline of heritage', url: 'https://www.thehindu.com/news/cities/Delhi/as-urdu-bazaar-fades-away-bookshop-owners-mourn-the-slow-decline-of-heritage/article68453975.ece', source: 'Anvee Bhutani, The Hindu' },
      { title: 'The quiet, contemplative life of a bookstore sales assistant', url: 'https://www.deccanherald.com/special-features/the-quiet-contemplative-life-of-a-bookstore-sales-assistant-1145769.html', source: 'Deccan Herald' },
      { title: 'Bhillar, The First Book Village Of India', url: 'https://astonishingindia.net/2017/11/02/bhillar-the-first-book-village-of-india/', source: 'Shoma Abhyankar, Astonishing India' },
      { title: 'Why Pagdandi of Pune transformed its library-cum-cafe into a bookstore during the pandemic', url: 'https://scroll.in/article/1001624/why-pagdandi-of-pune-transformed-its-library-cum-cafe-into-a-bookstore-during-the-pandemic', source: 'Arunima Mazumdar, Scroll' },
      { title: 'Pune’s Sophia Book Store: The bookshop with heart that could (so it did) become successful', url: 'https://scroll.in/article/881747/punes-sophia-book-store-the-bookshop-with-heart-that-could-so-it-did-become-successful', source: 'Damini Kulkarni, Scroll' },
      { title: 'These iconic bookstores in India still have readers enraptured', url: 'https://www.cntraveller.in/story/these-iconic-bookstores-in-india-still-have-readers-enraptured/', source: 'Arundhati Ail, Condé Nast Traveller India' },
      { title: 'Library on Wheels for the first time in Pune, unique initiative by autorickshaw driver', url: 'https://www.mypunepulse.com/library-on-wheels-for-the-first-time-in-pune-unique-initiative-by-autorickshaw-driver/', source: 'Pune Pulse' },
      { title: 'The Gothic revival of Mumbai’s iconic David Sassoon Library', url: 'https://www.architecturaldigest.in/story/the-gothic-revival-of-mumbais-iconic-david-sassoon-library-renovation-india-abha-narain-lambah/', source: 'Neerja Deodhar, Architectural Digest India' },
      { title: 'The 13 Most Beautiful Libraries in the World', url: 'https://www.cntraveller.in/gallery/the-13-most-beautiful-libraries-in-the-world/', source: 'Katherine McLaughlin, Condé Nast Traveller India' },
      { title: 'A unique bookselling course to roll out this year', url: 'https://lifestyle.livemint.com/news/talking-point/bookselling-course-independent-bookstore-walking-bookfairs-111684385622374.html', source: 'Mint Lounge' },
      { title: 'Kolkata: The iconic Seagull bookstore’s new home is a testament to its prolific legacy', url: 'https://www.architecturaldigest.in/story/kolkata-the-iconic-seagull-bookstores-new-home-is-a-testament-to-its-prolific-legacy/', source: 'Parni Ray, Architectural Digest India' },
      { title: 'With vast collection of books and rare records, 118-year-old Dhananja…', url: 'https://archive.ph/HJbnZ', source: 'archived article' },
      { title: 'A pre-Independence Urdu library in Bhopal struggles to stay afloat', url: 'https://caravanmagazine.in/literature/pre-independence-urdu-library-bhopal', source: 'The Caravan' },
      { title: 'A world of rare books and rare people', url: 'https://www.thehindu.com/opinion/columns/a-world-of-rare-books-and-rare-people/article68901116.ece', source: 'Suresh Menon, The Hindu' },
      { title: 'Inside Hyderabad’s newest independent bookstore, Off the Shelf', url: 'https://www.thehindu.com/news/cities/Hyderabad/inside-hyderabads-newest-independent-bookstore-off-the-shelf/article68676992.ece', source: 'Sangeetha Devi Dundoo, The Hindu' },
      { title: 'Mirza Yaseen Baig, the Hyderabadi Who Founded Delhi’s Popular Chain of Bookstores', url: 'https://thewire.in/books/mirza-yaseen-baig-the-hyderabadi-who-founded-delhis-popular-chain-of-bookstores', source: 'Mahtab Alam, The Wire' },
      { title: 'Mumbai: Free library comes up at Girgaon Chowpatty’s Nana Nani Park', url: 'https://www.mid-day.com/mumbai/mumbai-news/article/mumbai-free-library-comes-up-at-girgaon-chowpatty-s-nana-nani-park-23328316', source: 'Hemal Ashar, Mid-day' },
      { title: 'Ann Patchett’s influence inspires new antiquarian bookstore in Bengaluru', url: 'https://www.newindianexpress.com/cities/bengaluru/2024/Dec/11/ann-patchetts-influence-inspires-new-antiquarian-bookstore-in-bengaluru', source: 'VR Ferose, The New Indian Express' },
      { title: 'That Book Store', url: 'https://garhwalpost.in/that-book-store/', source: 'Garhwal Post' },
      { title: '‘I Never Got to Read’: 74-YO Grandmother Runs a Unique ‘Book Hotel’ With 5000 Books!', url: 'https://www.thebetterindia.com/344848/nashik-bhimabai-jondhale-ajjichya-pustakancha-hotel-book-hotel-by-grandmother/', source: 'Tina Freese, The Better India' },
      { title: 'Books, Bicycles and a Boy: An eco-conscious lending library in Goa', url: 'https://www.artnowthus.in/blog/spotlight-books-bicycles-and-a-boy-an-eco-conscious-lending-library-in-goa', source: 'Art Now Thus' },
      { title: 'Nagasri, 48-year-old Jayanagar bookstore, shuts down tomorrow', url: 'https://www.deccanherald.com/india/karnataka/bengaluru/nagasri-48-year-old-jayanagar-bookstore-shuts-down-tomorrow-3056127', source: 'Deccan Herald' },
      { title: 'Attention, Bibliophiles: Borrow Unlimited Books At A Time From This Library', url: 'https://lbb.in/pune/bookaholic-library/', source: 'LBB Pune' },
      { title: 'Lost in a mountain of books', url: 'https://www.thehindu.com/opinion/open-page/lost-in-a-mountain-of-books/article68269483.ece', source: 'Vivek K. Agnihotri, The Hindu' },
    ],
  },
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
