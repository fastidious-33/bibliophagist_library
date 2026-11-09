import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { basteleur, gambetta, sligoil, pinyon } from '@/lib/fonts';
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

const SITE_NAME = 'Bibliophagist Library';
const SITE_DESCRIPTION = 'A small lending library: browse the catalog and borrow a book.';

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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${basteleur.variable} ${gambetta.variable} ${sligoil.variable} ${pinyon.variable}`}>
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
            <div className="brand-row">
              <Link href="/" className="brand">
                <span className="brand-mark">Ex Libris</span>
                <span className="brand-name">Bibliophagist Library</span>
              </Link>
              <ThemeToggle />
            </div>
            <PrimaryNav />
          </header>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <footer className="site-footer">
            <div className="footer-row">
              <span>Bibliophagist Library &middot; a lending library, cataloged</span>
              <div className="footer-links">
                <Link href="/">Home</Link>
                <Link href="/catalog">Catalog</Link>
                <Link href="/about">About</Link>
              </div>
            </div>
            <div className="footer-clock">
              <span className="footer-clock-label">The time, in literary quotes</span>
              <iframe
                src="https://www.ticktockquotes.com/"
                title="Literary clock"
                loading="lazy"
                className="footer-clock-frame"
                // Third-party page embedded on every route. sandbox drops it
                // to minimum privileges — scripts only, no forms, no popups,
                // no top-level navigation, and a separate origin so it can't
                // reach our cookies or storage. referrerPolicy stops us
                // leaking which page each visitor is on.
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
              />
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
