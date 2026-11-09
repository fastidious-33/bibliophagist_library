import { createClient } from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

// The site works with placeholder data out of the box so it can be previewed
// before Sanity is wired up. Once NEXT_PUBLIC_SANITY_PROJECT_ID is set (see
// .env.local.example), real catalog entries take over automatically.
export const isSanityConfigured = Boolean(projectId);

export const sanityClient = isSanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: true,
    })
  : null;
