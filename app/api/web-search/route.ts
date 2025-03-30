import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Perform web search using Google's Custom Search API
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('key', process.env.GOOGLE_SEARCH_API_KEY || '');
    searchUrl.searchParams.append('cx', process.env.GOOGLE_SEARCH_ENGINE_ID || '');
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('num', '5'); // Get top 5 results
    searchUrl.searchParams.append('sort', 'date'); // Sort by date for latest results
    searchUrl.searchParams.append('dateRestrict', 'd1'); // Restrict to last 24 hours

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error('Search API request failed');
    }

    if (!data.items || data.items.length === 0) {
      // If no results found with date restriction, try without it
      searchUrl.searchParams.delete('dateRestrict');
      const fallbackResponse = await fetch(searchUrl.toString());
      const fallbackData = await fallbackResponse.json();
      
      if (!fallbackResponse.ok || !fallbackData.items) {
        return NextResponse.json({ results: '' });
      }
      data.items = fallbackData.items;
    }

    // Format the search results
    const formattedResults = data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      date: item.pagemap?.metatags?.[0]?.['article:published_time'] || 
            item.pagemap?.metatags?.[0]?.['og:updated_time'] ||
            item.pagemap?.metatags?.[0]?.['date'] ||
            null,
    }));

    // Create a natural language summary of the results
    const summary = `Here's the latest information:

${formattedResults.map((result: any, index: number) => 
  `${index + 1}. ${result.title}
     ${result.snippet}
     Source: ${result.link}
     ${result.date ? `Last Updated: ${new Date(result.date).toLocaleString()}` : ''}`
).join('\n\n')}

This information was gathered from web searches and was last updated ${new Date().toLocaleString()}.`;

    return NextResponse.json({ results: summary });
  } catch (error) {
    console.error('Web search error:', error);
    // Return empty results instead of error to handle gracefully in the chat
    return NextResponse.json({ results: '' });
  }
} 