import Typesense from 'typesense';
import { booksSchema, BOOKS_COLLECTION_NAME } from './schema.mjs';
import { fetchAllBooksFromSanity, bookToTypesenseDoc } from './transform.mjs';

function getTypesenseClient() {
  const { TYPESENSE_HOST, TYPESENSE_PORT, TYPESENSE_PROTOCOL, TYPESENSE_API_KEY } = process.env;
  if (!TYPESENSE_HOST || !TYPESENSE_API_KEY) {
    throw new Error('Missing TYPESENSE_HOST or TYPESENSE_API_KEY in the environment.');
  }
  return new Typesense.Client({
    nodes: [
      {
        host: TYPESENSE_HOST,
        port: Number(TYPESENSE_PORT) || 443,
        protocol: TYPESENSE_PROTOCOL || 'https',
      },
    ],
    apiKey: TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 10,
  });
}

async function ensureCollectionExists(client) {
  try {
    await client.collections(BOOKS_COLLECTION_NAME).retrieve();
  } catch (err) {
    // Typesense throws on a 404 lookup — that's the "doesn't exist yet" case.
    if (err?.httpStatus !== 404) throw err;
    console.log(`Collection "${BOOKS_COLLECTION_NAME}" doesn't exist yet — creating it...`);
    await client.collections().create(booksSchema);
  }
}

/**
 * Full sync: fetch every book from Sanity, transform, and upsert into
 * Typesense. Safe to re-run any number of times (upsert, not create) —
 * this is the disaster-recovery / boot-time rebuild path.
 */
export async function runFullSync() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

  const client = getTypesenseClient();
  await ensureCollectionExists(client);

  console.log(`Fetching books from Sanity (project ${projectId}, dataset ${dataset})...`);
  const books = await fetchAllBooksFromSanity({ projectId, dataset });
  console.log(`Fetched ${books.length} book(s) from Sanity.`);

  const docs = [];
  const skipped = [];
  for (const book of books) {
    const doc = bookToTypesenseDoc(book);
    if (doc) {
      docs.push(doc);
    } else {
      skipped.push(book._id);
    }
  }

  if (docs.length === 0) {
    console.log('Nothing to sync (0 valid documents).');
    return { synced: 0, failed: 0, skipped: skipped.length };
  }

  const results = await client
    .collections(BOOKS_COLLECTION_NAME)
    .documents()
    .import(docs, { action: 'upsert' });

  const failures = results.filter((r) => r.success === false);
  const successCount = results.length - failures.length;

  console.log(`Sync summary: ${successCount} synced, ${failures.length} failed, ${skipped.length} skipped (no slug).`);
  if (failures.length > 0) {
    console.error('Failed documents:');
    failures.forEach((f, i) => console.error(`  [${i}] ${JSON.stringify(f)}`));
  }

  return { synced: successCount, failed: failures.length, skipped: skipped.length };
}

/**
 * Upsert a single book — used by the Sanity webhook route for real-time
 * updates. Assumes the collection already exists (created by the initial
 * full sync); does NOT check/create it on every webhook call, to keep
 * webhook latency low.
 */
export async function upsertOneBook(book) {
  const client = getTypesenseClient();
  const doc = bookToTypesenseDoc(book);
  if (!doc) {
    console.warn(`Skipping book ${book._id}: no slug.`);
    return { skipped: true };
  }
  await client.collections(BOOKS_COLLECTION_NAME).documents().upsert(doc);
  return { skipped: false };
}

/** Delete a single book from the index — used by the webhook on doc deletion. */
export async function deleteOneBook(id) {
  const client = getTypesenseClient();
  try {
    await client.collections(BOOKS_COLLECTION_NAME).documents(id).delete();
  } catch (err) {
    // Already gone / never indexed — not an error worth failing the webhook over.
    if (err?.httpStatus !== 404) throw err;
  }
}
