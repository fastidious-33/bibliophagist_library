import localFont from 'next/font/local';
import { Pinyon_Script } from 'next/font/google';

// Display + stamp. Basteleur ships two separate files that do different
// jobs: Moonlight (hairline) for large display settings, Bold for stamps.
// Declared as one family with two weights so CSS can pick by weight.
export const basteleur = localFont({
  src: [
    { path: '../app/fonts/Basteleur-Moonlight.woff2', weight: '300', style: 'normal' },
    { path: '../app/fonts/Basteleur-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-basteleur',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

// Heading, body and labels (call numbers, controls — with tabular figures).
// Variable font, so every weight 300–700 is real, never synthesised. The
// italic is a true italic (separate file).
export const gambetta = localFont({
  src: [
    { path: '../app/fonts/Gambetta-Variable.woff2', weight: '300 700', style: 'normal' },
    { path: '../app/fonts/Gambetta-VariableItalic.woff2', weight: '300 700', style: 'italic' },
  ],
  variable: '--font-gambetta',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

// Accent — the librarian's marginalia only (the slip's heading and
// signature on a book page).
export const pinyon = Pinyon_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pinyon',
  display: 'swap',
});
