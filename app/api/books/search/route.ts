import { NextRequest, NextResponse } from 'next/server';
import { searchBooks } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await searchBooks(searchParams);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Catalog search failed:', err);
    return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 502 });
  }
}
