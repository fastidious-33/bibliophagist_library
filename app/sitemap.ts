import type { MetadataRoute } from 'next';
import { SITE_URL as BASE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/catalog`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/ledger`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
