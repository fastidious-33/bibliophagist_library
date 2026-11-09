import { NextRequest, NextResponse } from 'next/server';
import { searchBooks } from '@/lib/typesense/search';
import { isTypesenseConfigured } from '@/lib/typesense/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isTypesenseConfigured) {
    return NextResponse.json(
      { error: 'Search is not configured (missing TYPESENSE_HOST / TYPESENSE_API_KEY).' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await searchBooks(searchParams);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Typesense search failed:', err);
    return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 502 });
  }
}
