import { NextResponse } from 'next/server';
import { performGoogleSearch } from '@/lib/google-search';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const results = await performGoogleSearch(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

// Optionally handle GET requests with an error
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Please use POST.' },
    { status: 405 }
  );
} 