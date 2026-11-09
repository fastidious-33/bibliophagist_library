import { NextRequest, NextResponse } from 'next/server';
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { sanityClient, isSanityConfigured } from '@/lib/sanity/client';
import { typesenseClient, isTypesenseConfigured, BOOKS_COLLECTION_NAME } from '@/lib/typesense/client';
import { bookToTypesenseDoc } from '@/lib/typesense/transform';

// Real-time counterpart to scripts/sync-typesense.mjs (the manual
// disaster-recovery fallback) and the container's boot-time full rebuild.
// This route only ever touches ONE document per call — cheap and fast,
// which is the point of having it alongside the other two sync paths.

const WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET;

// Same projection as scripts/typesense/transform.mjs's SANITY_QUERY — keep
// these in sync if the book schema changes.
const BOOK_BY_ID_QUERY = `*[_id == $id][0]{
  _id,
  title,
  author,
  theme,
  tags,
  language,
  rating,
  publishingDate,
  "slug": slug.current,
  coverUrl
}`;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'SANITY_WEBHOOK_SECRET is not configured.' }, { status: 500 });
  }
  if (!isTypesenseConfigured || !typesenseClient) {
    return NextResponse.json({ error: 'Typesense is not configured.' }, { status: 503 });
  }
  if (!isSanityConfigured || !sanityClient) {
    return NextResponse.json({ error: 'Sanity is not configured.' }, { status: 503 });
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
  if (_type && _type !== 'book') {
    // Defense in depth — the webhook's own filter (configured in Sanity's
    // dashboard) should already restrict this to book documents.
    return NextResponse.json({ ignored: true, reason: 'not a book document' });
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
      return NextResponse.json({ deleted: true, id: _id });
    }

    const doc = bookToTypesenseDoc(freshBook);
    if (!doc) {
      return NextResponse.json({ skipped: true, reason: 'no slug', id: _id });
    }
    await typesenseClient.collections(BOOKS_COLLECTION_NAME).documents().upsert(doc);
    return NextResponse.json({ upserted: true, id: _id });
  } catch (err) {
    console.error('Sanity webhook -> Typesense sync failed:', err);
    return NextResponse.json({ error: 'Sync failed.' }, { status: 502 });
  }
}
