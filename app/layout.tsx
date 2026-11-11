import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { basteleur, gambetta, pinyon } from '@/lib/fonts';
import PrimaryNav from '@/components/PrimaryNav';
import { THEME_COLORS } from '@/lib/theme';
import { SITE_URL, CONTACT } from '@/lib/site';
import RandomBookLink from '@/components/RandomBookLink';
import { BROWSE_LINKS } from '@/lib/browse';
import { ROOMS } from '@/lib/librarian';

// Runs before first paint (blocking, in <head>) so the correct theme is
// applied immediately \u2014 no flash of light mode before dark mode kicks in.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('bibliophagist-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '${THEME_COLORS.dark}' : '${THEME_COLORS.light}');
  } catch (e) {}
})();
`;

const SITE_NAME = 'Home of a Bibliophagist';
const SITE_DESCRIPTION = 'A personal lending library: browse the catalog, meet the librarian, borrow a book.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${basteleur.variable} ${gambetta.variable} ${pinyon.variable}`}>
      <head>
        {/* Before the init script, so the script can find and correct it. */}
        <meta name="theme-color" content={THEME_COLORS.light} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="cabinet">
          <header className="site-header">
            <Link href="/" className="brand">
              Home of a Bibliophagist
            </Link>
            {/* Grid cells, placed in globals.css: the book flanks the links
                on both sides and the lamp floats in the bottom-right
                corner. */}
            <PrimaryNav />
            <div className="header-tools">
              <RandomBookLink iconOnly inHeader />
              {/* The book's mirrored twin, so it flanks the links. */}
              <RandomBookLink iconOnly inHeader mirror />
              <ThemeToggle />
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          {/* A small site map: the same links as /browse and /librarian. */}
          <footer className="site-footer">
            <p className="footer-sign">Let&rsquo;s read together!</p>
            <div className="footer-map">
              <nav aria-labelledby="footer-browse">
                <h2 id="footer-browse" className="footer-heading">
                  <Link href="/browse">Browse</Link>
                </h2>
                <ul className="footer-links">
                  {BROWSE_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.title}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav aria-labelledby="footer-librarian">
                <h2 id="footer-librarian" className="footer-heading">
                  <Link href="/librarian">The Librarian</Link>
                </h2>
                <ul className="footer-links">
                  {ROOMS.map((room) => (
                    <li key={room.href}>
                      <Link href={room.href}>{room.title}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <p className="footer-social">
              <a href={CONTACT.substack} target="_blank" rel="noopener noreferrer">
                Substack
              </a>
              <span aria-hidden="true"> &middot; </span>
              <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </p>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
