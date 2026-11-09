import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import {
  isSanityConfigured,
  getBooks,
  getBookCount,
  getStoredBookCount,
  getBookSlugAt,
  BOOK_COUNT_TAG,
} from '@/lib/sanity';

// A route handler, not a page: revalidateTag (used below when the stored
// count turns out to be stale) can only be called from route handlers and
// server actions, never while a page renders.
export async function GET(request: NextRequest) {
  const slug = await pickRandomSlug();
  // 307 = temporary, so browsers never cache "random" as one fixed book.
  return NextResponse.redirect(new URL(slug ? `/catalog/${slug}` : '/catalog', request.url), 307);
}

async function pickRandomSlug(): Promise<string | undefined> {
  // No Sanity (e.g. local dev without env vars): pick a placeholder book.
  if (!isSanityConfigured) {
    const books = await getBooks();
    return books[Math.floor(Math.random() * books.length)]?.slug;
  }

  try {
    const slug = await slugAtRandomPosition(await getStoredBookCount());
    if (slug) return slug;

    // Nothing at that position: the stored count is higher than the real
    // one (books were deleted). Discard the stored count so later clicks
    // recount, and retry this one with a fresh, uncached count.
    revalidateTag(BOOK_COUNT_TAG, { expire: 0 });
    return await slugAtRandomPosition((await getBookCount()) ?? 0);
  } catch (err) {
    console.error('Random book pick failed — sending to the catalog:', err);
    return undefined;
  }
}

function slugAtRandomPosition(count: number): Promise<string | undefined> {
  if (count <= 0) return Promise.resolve(undefined);
  return getBookSlugAt(Math.floor(Math.random() * count));
}
