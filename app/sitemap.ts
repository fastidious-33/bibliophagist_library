import type { MetadataRoute } from 'next';
import { SITE_URL as BASE_URL } from '@/lib/site';
import { getBooks } from '@/lib/sanity';
import { getGenres, type Genre } from '@/lib/genres';
import { ROOMS } from '@/lib/librarian';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await getBooks();
  // A Sanity blip shouldn't take the whole sitemap down — the genres just
  // drop out until the next regeneration.
  let genres: Genre[] = [];
  try {
    genres = await getGenres();
  } catch (err) {
    console.error('Sitemap: could not load genres:', err);
  }
  return [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/browse`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/catalog`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/catalog/genres`, changeFrequency: 'weekly', priority: 0.7 },
    ...genres.map((g) => ({
      url: `${BASE_URL}/catalog/genres/${g.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/story`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/borrow`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/librarian`, changeFrequency: 'monthly', priority: 0.5 },
    ...ROOMS.map((room) => ({
      url: `${BASE_URL}${room.href}`,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
    ...books
      .filter((book) => typeof book.slug === 'string' && book.slug.length > 0)
      .map((book) => ({
        url: `${BASE_URL}/catalog/${book.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.4,
      })),
  ];
}
