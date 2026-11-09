#!/usr/bin/env node
// Runs INSIDE the Typesense container at boot (see typesense/docker-entrypoint.sh).
//
// Unlike scripts/sync-typesense.mjs (run from your own machine against the
// PUBLIC Typesense URL), this talks to Typesense over localhost — it's in
// the same container, so there's no need to round-trip through the public
// internet just to populate its own index.
//
// TYPESENSE_API_KEY, plus the Sanity project vars, still come from the
// container's real environment (set in the Northflank service settings). Only
// host/port/protocol are overridden here to point at localhost.

process.env.TYPESENSE_HOST = 'localhost';
process.env.TYPESENSE_PORT = process.env.TYPESENSE_INTERNAL_PORT || '8108';
process.env.TYPESENSE_PROTOCOL = 'http';

const { runFullSync } = await import('./sync-core.mjs');

runFullSync()
  .then(({ synced, failed, skipped }) => {
    console.log(`Container boot sync done. ${synced} synced, ${failed} failed, ${skipped} skipped.`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Container boot sync failed:', err);
    process.exit(1);
  });
