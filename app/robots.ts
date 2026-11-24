import type { MetadataRoute } from 'next';

import { SITE_URL as BASE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Members' pages (M3): personal, and nothing to find there.
      disallow: ['/account', '/signin', '/desk'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
