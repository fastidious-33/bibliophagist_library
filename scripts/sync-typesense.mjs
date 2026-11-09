#!/usr/bin/env node
// Manual / re-runnable full sync from Sanity into Typesense.
//
// Run with:  npm run sync:typesense
// (that script uses Node's built-in --env-file flag to load .env.local —
// no dotenv package needed, since this repo requires Node >=20.9.0.)
//
// Requires these in your environment (.env.local) — see .env.example:
//   TYPESENSE_HOST, TYPESENSE_PORT, TYPESENSE_PROTOCOL, TYPESENSE_API_KEY
//   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET
//
// This is the disaster-recovery fallback: the live index is normally kept
// up to date by (a) the container re-running this same logic on every
// boot, and (b) the Sanity webhook pushing single-book updates in real
// time. Run this by hand if you ever suspect the index has drifted, or
// after a bulk edit in Sanity Studio.

import { runFullSync } from './typesense/sync-core.mjs';

runFullSync()
  .then(({ synced, failed, skipped }) => {
    console.log(`Done. ${synced} synced, ${failed} failed, ${skipped} skipped.`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
