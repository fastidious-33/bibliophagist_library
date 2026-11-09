import { sanityClient, isSanityConfigured } from '@/lib/sanity';

// Never cached, never prerendered — a cached health check tells you
// nothing about health right now.
export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };

  if (!isSanityConfigured || !sanityClient) {
    return Response.json(
      { status: 'error', reason: 'sanity-not-configured' },
      { status: 503, headers }
    );
  }

  try {
    // withConfig({ useCdn: false }) matters here: the default client reads
    // through Sanity's CDN, which would happily serve a cached count while
    // the API behind it is down — reporting healthy during an outage.
    const count = await sanityClient
      .withConfig({ useCdn: false })
      .fetch<number>('count(*[_type == "book"])');

    return Response.json({ status: 'ok', books: count }, { status: 200, headers });
  } catch (err) {
    console.error('Health check failed — Sanity unreachable:', err);
    return Response.json(
      { status: 'error', reason: 'sanity-unreachable' },
      { status: 503, headers }
    );
  }
}