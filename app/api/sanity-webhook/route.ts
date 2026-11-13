import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { sanityClient, isSanityConfigured } from '@/lib/sanity/client';
import { typesenseClient, isTypesenseConfigured, BOOKS_COLLECTION_NAME } from '@/lib/typesense/client';
import { bookToTypesenseDoc } from '@/lib/typesense/transform';
import { BOOKS_TAG } from '@/lib/search';
import { CONTENT_TAG } from '@/lib/sanity/content';

// Sanity calls this whenever a book or a Librarian room document is
// published or deleted.
//
// Room documents (heading, subheading, entry): drop the cached room content
// (tag `content`, see lib/sanity/content.ts), so the room pages rebuild on
// their next visit. Nothing else to do.
//
// Books, two jobs:
// 1. Always: drop the cached catalog search index (tag `books`, see
//    lib/search/sanity.ts) so the next search reloads it from Sanity.
// 2. When Typesense is running: re-fetch that ONE document and upsert or
//    delete it in the index — the real-time counterpart to the container's
//    boot-time rebuild and scripts/sync-typesense.mjs.

const CONTENT_TYPES = ['heading', 'subheading', 'entry'];

const WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET;

// Same projection as scripts/typesense/transform.mjs's SANITY_QUERY — keep
// these in sync if the book schema changes.
const BOOK_BY_ID_QUERY = `*[_id == $id][0]{
  _id,
  bookId,
  title,
  author,
  tags,
  rating,
  publishingDate,
  "slug": slug.current,
  coverUrl
}`;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'SANITY_WEBHOOK_SECRET is not configured.' }, { status: 500 });
  }

  // Signature verification needs the raw, unparsed body.
  const rawBody = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER_NAME) ?? '';
  const valid = await isValidSignature(rawBody, signature, WEBHOOK_SECRET);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let payload: { _id?: string; _type?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  const { _id, _type } = payload;
  if (!_id) {
    return NextResponse.json({ error: 'Missing _id in webhook payload.' }, { status: 400 });
  }
  if (_type && CONTENT_TYPES.includes(_type)) {
    revalidateTag(CONTENT_TAG, { expire: 0 });
    return NextResponse.json({ revalidated: true, tag: CONTENT_TAG, id: _id });
  }
  if (_type && _type !== 'book') {
    // Defense in depth — the webhook's own filter (configured in Sanity's
    // dashboard) should already restrict this to books and room documents.
    return NextResponse.json({ ignored: true, reason: 'not a book or room document' });
  }

  revalidateTag(BOOKS_TAG, { expire: 0 });

  if (!isTypesenseConfigured || !typesenseClient) {
    return NextResponse.json({ revalidated: true, typesense: 'not configured', id: _id });
  }
  if (!isSanityConfigured || !sanityClient) {
    return NextResponse.json({ error: 'Sanity is not configured.' }, { status: 503 });
  }

  try {
    // Always re-fetch fresh from Sanity rather than trusting the webhook
    // payload's own shape — this also doubles as our delete-detection: if
    // the doc is gone, it was deleted (or never existed).
    const freshBook = await sanityClient.fetch(BOOK_BY_ID_QUERY, { id: _id });

    if (!freshBook) {
      await typesenseClient.collections(BOOKS_COLLECTION_NAME).documents(_id).delete().catch((err) => {
        // Already absent from the index — not an error worth failing over.
        if (err?.httpStatus !== 404) throw err;
      });
      return NextResponse.json({ revalidated: true, deleted: true, id: _id });
    }

    const doc = bookToTypesenseDoc(freshBook);
    if (!doc) {
      return NextResponse.json({ revalidated: true, skipped: true, reason: 'no slug', id: _id });
    }
    await typesenseClient.collections(BOOKS_COLLECTION_NAME).documents().upsert(doc);
    return NextResponse.json({ revalidated: true, upserted: true, id: _id });
  } catch (err) {
    console.error('Sanity webhook -> Typesense sync failed:', err);
    return NextResponse.json({ error: 'Sync failed.' }, { status: 502 });
  }
}
