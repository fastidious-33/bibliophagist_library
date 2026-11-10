import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { basteleur, gambetta, pinyon } from '@/lib/fonts';
import PrimaryNav from '@/components/PrimaryNav';
import { THEME_COLORS } from '@/lib/theme';
import { SITE_URL } from '@/lib/site';

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

// Placeholder email until the real one is decided (M1-DESIGN.md).
const CONTACT = {
  substack: 'https://abibliophagist.substack.com/',
  instagram: 'https://www.instagram.com/a.bibliophagist/',
  email: 'testemail@gmail.com',
};

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
            <div className="header-nav">
              <PrimaryNav />
              <ThemeToggle />
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <footer className="site-footer">
            <div className="footer-row">
              <p className="footer-sign">Let&rsquo;s read together!</p>
              <nav className="footer-links" aria-label="Footer">
                {/* /about until /borrow exists (M1 group 4). */}
                <Link href="/about#how-to-borrow">How to borrow</Link>
                <Link href="/ledger">Ledger</Link>
                <a href={CONTACT.substack} target="_blank" rel="noopener noreferrer">
                  Substack
                </a>
                <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
                <a href={`mailto:${CONTACT.email}`}>Email</a>
              </nav>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
